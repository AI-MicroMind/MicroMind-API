const fs = require('fs');
const path = require('path');
// const { rootPath } = require('./utils'); // Assuming you have a utils file to get the root path
const multer = require('multer');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Message = require('../models/messageModel');
const { isPostalCodeLocales } = require('validator');

const multerFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('image') ||
    file.mimetype.startsWith('audio') ||
    file.mimetype.startsWith('text')
  ) {
    cb(null, true);
  } else {
    cb(
      new AppError('The file you are trying to upload is not supported.', 400),
      false
    );
  }
};

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/chat-uploads/'); // Specify the directory to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, `file-${Date.now()}-${file.originalname}`); // Generate a unique filename
  },
});

const upload = multer({
  storage: multerStorage,
  // fileFilter: multerFilter,
});

exports.uploadMessagefile = upload.single('file');

// const fileToBase64 = catchAsync(async (req, res) => {
//   const filePath = './public/files/uploads/your_file.jpg'; // Replace with actual file path
//   const data = await fs.readFile(filePath, 'base64');
//   res.status(200).json({ base64Data: data });
// });

//--------------------------------------------------

async function query(data, chatUrl) {
  const response = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  return result;
}

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { text, chatUrl } = req.body;

  let uploads = [];
  if (req.file) {
    console.log(req.file);
    // console.log(req.file);
    // destination: 'public/chat-uploads/',
    // filename: 'file-1734150175524-kitten.png',
    // console.log(req.file);
    console.log(req.get('host'));
    const filePath = path.join(req.get('host'), req.file.path);
    if (req.file.mimetype.startsWith('image')) {
      uploads.push({
        data: filePath, //base64 string or url
        type: 'url', // file | url
        name: req.file.filename,
        mime: 'image/jpeg',
      });
    }

    console.dir(`Uploads: ${uploads}`);

    // console.log(filePath);
    // const fileData = fs.readFileSync(filePath);
    // console.log(`file Data: ${fileData}`);
    // const fileToBase64 = fileData.toString('base64');

    // console.log(fileToBase64);
  }
  const [botResponse, userMessage] = await Promise.all([
    query(
      {
        question: req.body.text || '',
        uploads,
        overrideConfig: {
          systemMessage: 'example',
          maxIterations: 1,
          sessionId: req.params.chatId,
          memoryKey: 'example',
        },
      },
      chatUrl
    ),
    Message.create({
      chat: req.params.chatId,
      sender: 'user',
      text,
      // photo,
      // voice,
    }),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      botResponse,
    },
  });

  // Save bot response to database
  Message.create({
    chat: req.params.chatId,
    sender: 'bot',
    text: botResponse.text,
  });
});

//..........................................................

// exports.sendMessage = catchAsync(async (req, res, next) => {
//   const { text, photo, voice } = req.body;

//   const [botResponse, userMessage] = await Promise.all([
//     query(
//       {
//         question: req.body.text || '',
//         uploads: [
//           {
//             data: 'data:image/png;base64,iVBORw0KGgdM2uN0', //base64 string or url
//             type: 'file', // file | url
//             name: 'Flowise.png',
//             mime: 'image/png',
//           },
//         ],
//         overrideConfig: {
//           systemMessage: 'example',
//           maxIterations: 1,
//           sessionId: req.params.chatId,
//           memoryKey: 'example',
//         },
//       },
//       req.body.chatUrl
//     ),
//     Message.create({
//       chat: req.params.chatId,
//       sender: 'user',
//       text,
//       photo,
//       voice,
//     }),
//   ]);

//   res.status(200).json({
//     status: 'success',
//     data: {
//       botResponse,
//     },
//   });

//   // Save bot response to database
//   Message.create({
//     chat: req.params.chatId,
//     sender: 'bot',
//     text: botResponse.text,
//   });
// });

exports.loadChatMessages = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const messages = await Message.find({ chat: req.params.chatId })
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages,
    },
  });
});

//-------------------------------------------------------------

// const {FlowiseClient} =  require('flowise-sdk')

// async function testStreaming() {
//   const client = new FlowiseClient({ baseUrl: 'http://localhost:3000' });

//   try {
//     // For streaming prediction
//     const prediction = await client.createPrediction({
//       chatflowId: '<chatflow-id>',
//       question: 'What is the capital of France?',
//       streaming: true,
//     });

//     for await (const chunk of prediction) {
//       // {event: "token", data: "hello"}
//       console.log(chunk);
//     }
//   } catch (error) {
//     console.error('Error:', error);
//   }
// }

// // Run streaming test
// testStreaming();
