const fs = require('fs');
const multer = require('multer');
const HTMLtoDOCX = require('html-to-docx');

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
    cb(null, '/var/uploads/chat-uploads/'); // Specify the directory to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, `file-${Date.now()}-${file.originalname}`); // Generate a unique filename
  },
});

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
  let messageType = 'text';

  // If there is uploaded files
  if (req.file) {
    console.log(req.file);
    fileName = `/uploads/chat-uploads/${req.file.filename}`;

    // const filePath = path.join(req.get('host'), req.file.path);
    const filePath = `${req.protocol}://${req.get(
      'host'
    )}/uploads/chat-uploads/${req.file.filename}`;

    // Handle images
    if (req.file.mimetype.startsWith('image')) {
      messageType = 'photo';
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
      messageType = 'file';
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
      messageType = 'file';
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
      messageType = 'file';
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

    // Handle Audio Uploads
    if (req.file.mimetype.startsWith('audio')) {
      messageType = 'audio';
      const audioBase64 = fs.readFileSync(req.file.path).toString('base64');
      // console.log(audioBase64);
      const audioData = `data:${req.file.mimetype};codecs=opus;base64,${audioBase64}`;

      uploads.push({
        data: audioData, // base64 string
        type: 'audio',
        name: req.file.filename,
        mime: 'audio/webm',
      });
      console.log(`DONE UPLOADING`);
    }
  }
  console.log(uploads);

  const [botResponse, userMessage] = await Promise.all([
    query(
      {
        question: req.body.text || '',
        uploads,
        overrideConfig: {
          // sessionId: 'example',
          sessionId: req.params.chatId,
          memoryKey: 'example',
          systemMessagePrompt: 'example',
          groqApiKey: 'example',
        },
      },
      chatUrl
    ),
    // query(
    //   {
    //     question: req.body.text || '',
    //     uploads,
    //     overrideConfig: {
    //       // systemMessage: 'example',
    //       // maxIterations: 1,
    //       sessionId: '1112223331',
    //       memoryKey: 'example',
    //       systemMessagePrompt: 'example',
    //       groqApiKey: 'example',
    //       // memoryKey: 'example',
    //     },
    //   },
    //   chatUrl
    // ),
    Message.create({
      chat: req.params.chatId,
      sender: 'user',
      text,
      file: fileName,
      type: messageType,
      // photo,
      // voice,
    }),
  ]);

  let botMessage;

  // IF THE RESPONSE FAILED
  if (!botResponse || botResponse.success === false) {
    console.log({ botResponse });

    console.log('ERROR PROCESSING MESSAGE');
    botMessage = await Message.create({
      chat: req.params.chatId,
      text: 'An error occured with your message. Try again.',
      sender: 'bot',
    });

    return res.status(200).json({
      status: 'success',
      data: {
        botMessage,
        userMessage,
      },
    });
  }

  console.log({ botResponse });
  if (botResponse.error === 'Unauthorized Access')
    return next(
      new AppError('Unautorized access to this chat bot. Try again.')
    );

  if (botResponse.status === 'error')
    return next(new AppError('An error occured with your message. Try again.'));

  // Remove imgur links from the response
  botResponse.text = botResponse.text
    .replace(/!\[.*?\]\(https?:\/\/i\.imgur\.com\/[^\)]+\)/g, '')
    .trim();

  // handle generated flowcharts
  if (
    botResponse.artifacts ||
    // Ensure that agentReasoning is an array and has artifacts
    (Array.isArray(botResponse.agentReasoning) &&
      botResponse.agentReasoning.some((el) => el?.artifacts && el.artifacts[0]))
  ) {
    const artifacts =
      botResponse.artifacts ||
      // Find the first element in agentReasoning that has artifacts
      botResponse.agentReasoning.find(
        (el) => Array.isArray(el.artifacts) && el.artifacts[0]
      ).artifacts;

    console.dir({ artifacts });
    // Extracting the artifact file name from the respons
    const artifacteFile = artifacts[0].data.split('::')[1];
    console.log('-------------------------------');
    console.log({ artifacteFile });
    const chatBaseChunks = chatUrl.split('/prediction/');
    const artifacteUrl = `${chatBaseChunks[0]}/get-upload-file?chatflowId=${chatBaseChunks[1]}&chatId=${req.params.chatId}&fileName=${artifacteFile}`;
    botMessage = await Message.create({
      chat: req.params.chatId,
      sender: 'bot',
      file: artifacteUrl,
      text: botResponse.text,
      type: 'photo',
    });
  }
  // // handle generated flowcharts
  // if (
  //   botResponse.artifacts ||
  //   (botResponse.agentReasoning &&
  //     botResponse.agentReasoning &&
  //     botResponse.agentReasoning[3] &&
  //     botResponse.agentReasoning[3].artifacts[0])
  // )
  // {
  //   const artifacts =
  //     botResponse.artifacts || botResponse.agentReasoning[3].artifacts[0];

  //   console.log({ artifacts });
  //   // Extracting the artifact file name from the respons
  //   const artifacteFile = artifacts.data.split('::')[1];
  //   console.log('-------------------------------');
  //   console.log({ artifacteFile });
  //   const chatBaseChunks = chatUrl.split('/prediction/');
  //   const artifacteUrl = `${chatBaseChunks[0]}/get-upload-file?chatflowId=${chatBaseChunks[1]}&chatId=${req.params.chatId}&fileName=${artifacteFile}`;
  //   botMessage = await Message.create({
  //     chat: req.params.chatId,
  //     sender: 'bot',
  //     file: artifacteUrl,
  //     text: botResponse.text,
  //     type: 'photo',
  //   });
  // }

  // handle generated photos
  else if (botResponse.text?.startsWith('![]')) {
    const photoUrl = botResponse.text.split('(')[1].split(')')[0];
    botMessage = await Message.create({
      chat: req.params.chatId,
      sender: 'bot',
      file: photoUrl,
      type: 'photo',
    });
  } else {
    botMessage = await Message.create({
      chat: req.params.chatId,
      sender: 'bot',
      text: botResponse.text,
    });
  }

  console.log({ botMessage });
  console.log(botMessage.text);

  // res.status(200).json({
  //   status: 'FUCK OFF',
  // });

  res.status(200).json({
    status: 'success',
    data: {
      botMessage,
      userMessage,
    },
  });
});

// Used to star/unstar a message
exports.starMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.messageId);

  if (!message)
    return next(new AppError('There is no message with that ID', 400));

  // Toggle star on that message
  message.starred = !message.starred;

  await message.save();

  res.status(200).json({
    status: 'success',
    data: {
      message,
    },
  });
});

exports.getChatStarredMessages = catchAsync(async (req, res, next) => {
  const starredMessages = await Message.find({
    chat: req.params.chatId,
    starred: true,
  });

  // if(!starredMessages) return next(new AppError("Sorry! You don't have any starred messages for that chat."))

  res.status(200).json({
    status: 'success',
    data: {
      starredMessages,
    },
  });
});

exports.loadChatMessages = catchAsync(async (req, res, next) => {
  if (!req.params.chatId)
    return next(new AppError('Please provide a chat ID', 400));
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

exports.loadChatFromStarredMessage = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, direction } = req.query;
  const skip = (page - 1) * limit;

  const starredMessage = await Message.findOne({
    _id: req.params.messageId,
    chat: req.params.chatId,
    starred: true,
  });

  if (!starredMessage)
    return next(new AppError('There is no message with that ID', 400));

  let messages = [];

  if (direction === 'before') {
    messages = await Message.find({
      chat: req.params.chatId,
      createdAt: { $lt: starredMessage.createdAt },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  } else if (direction === 'after') {
    messages = await Message.find({
      chat: req.params.chatId,
      createdAt: { $gte: starredMessage.createdAt },
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    messages.reverse();
  } else {
    return next(new AppError('Please provide a direction', 400));
  }

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages,
    },
  });
});

exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findByIdAndDelete(req.params.messageId);

  if (!message)
    return next(new AppError('There is no message with that ID', 400));

  res.status(200).json({
    status: 'success',
    message: 'Message deleted successfully',
  });
});

exports.exportToDocx = catchAsync(async (req, res, next) => {
  // const message = await Message.findById(req.params.messageId);

  // if (!message)
  //   return next(new AppError('There is no message with that ID', 400));

  // console.log(message);

  // Convert HTML to DOCX
  // const docxBuffer = await HTMLtoDOCX(req.body.htmlContent);
  const docxBuffer = await HTMLtoDOCX(req.body);

  // Set headers for file download
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="AI-MicroMind-${Date.now()}.docx"`
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );

  res.send(docxBuffer);
});

// exports.exportToDocx2 = catchAsync(async (req, res, next) => {

//   // Set headers for file download
//   res.setHeader(
//     'Content-Disposition',
//     `attachment; filename="AI-MicroMind-${Date.now()}.docx"`
//   );
//   res.setHeader(
//     'Content-Type',
//     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//   );

//   res.send(docxBuffer);
// })

// const htmlContent =
//   '<p>Here are the top sales representatives based on their achievement percentages:</p>';
//   const htmlContent = `
//   <p>Here are the top sales representatives based on their achievement percentages:</p>
// <table>
// <thead>
// <tr>
// <th><strong>Sales Representative</strong></th>
// <th><strong>Sales Rep Number</strong></th>
// <th><strong>Total Sales</strong></th>
// <th><strong>Total Target</strong></th>
// <th><strong>Achievement Percentage</strong></th>
// </tr>
// </thead>
// <tbody><tr>
// <td>عمر طارق ناصر</td>
// <td>513</td>
// <td>303,530.49</td>
// <td>100,656.56</td>
// <td>301.55%</td>
// </tr>
// <tr>
// <td>هيثم عبد السادة</td>
// <td>514</td>
// <td>225,253.47</td>
// <td>113,031.76</td>
// <td>199.28%</td>
// </tr>
// <tr>
// <td>طارق حسين محمد</td>
// <td>704</td>
// <td>169,197.27</td>
// <td>91,564.53</td>
// <td>184.78%</td>
// </tr>
// <tr>
// <td>مالك خالد عباس</td>
// <td>222</td>
// <td>112,362.35</td>
// <td>62,872.05</td>
// <td>178.72%</td>
// </tr>
// <tr>
// <td>أحمد أيوب محمد-FR</td>
// <td>561</td>
// <td>111,318.22</td>
// <td>63,471.70</td>
// <td>175.38%</td>
// </tr>
// </tbody></table>
// <p>These representatives have demonstrated exceptional performance by significantly surpassing their sales targets.</p>
// `;
