const fs = require('fs');
const path = require('path');
const multer = require('multer');
// File Loaders
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Message = require('../models/messageModel');

const multerFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('image') ||
    file.mimetype.startsWith('audio') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' || // doc files
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // docx
    file.mimetype === 'application/vnd.ms-excel' || //xls
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' //xls
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
  let fileName;

  // If there is uploaded files
  if (req.file) {
    fileName = req.file.filename;

    // const filePath = path.join(req.get('host'), req.file.path);
    const filePath = `${req.protocol}://${req.get('host')}/chat-uploads/${
      req.file.filename
    }`;

    // Handle images
    if (req.file.mimetype.startsWith('image')) {
      uploads.push({
        data: filePath, //base64 string or url
        type: 'url', // file | url
        name: req.file.filename,
        mime: 'image/jpeg',
      });
    }

    // Handle PDF files
    else if (
      req.file.mimetype === 'application/pdf' // PDF files
    ) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdf(fileBuffer); // Extract text from PDF
      uploads.push({
        data: pdfData.text, // Extracted text
        type: 'file:full',
        name: req.file.filename,
        mime: req.file.mimetype,
      });
    }

    // Handle word document doc or docx
    else if (
      req.file.mimetype === 'application/msword' || // doc files
      req.file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // docx
    ) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const wordData = await mammoth.extractRawText({ buffer: fileBuffer });
      uploads.push({
        data: wordData.value, // Extracted text
        type: 'file:full',
        name: req.file.filename,
        mime: req.file.mimetype,
      });
    }

    // Handle excel sheet xls or xlsx
    else if (
      req.file.mimetype === 'application/vnd.ms-excel' || //xls
      req.file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' //xls
    ) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

      // Extract data from the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const excelData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }); // Extract as 2D array

      uploads.push({
        data: JSON.stringify(excelData), // Convert the array to JSON
        type: 'file:full',
        name: req.file.filename,
        mime: req.file.mimetype,
      });
    }
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
      file: fileName,
      // photo,
      // voice,
    }),
  ]);
  console.log(botResponse);
  if (botResponse.status === 'error')
    return next(new AppError('An error occured with your message. Try again.'));

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
