const fs = require('fs');
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
  if (botResponse.status === 'error')
    return next(new AppError('An error occured with your message. Try again.'));

  // Remove imgur links from the response
  botResponse.text = botResponse.text
    .replace(/!\[.*?\]\(https?:\/\/i\.imgur\.com\/[^\)]+\)/g, '')
    .trim();

  // handle generated flowcharts
  if (botResponse.artifacts) {
    // Extracting the artifact file name from the respons
    const artifacteFile = botResponse.artifacts[0].data.split('::')[1];
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

exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findByIdAndDelete(req.params.messageId);

  if (!message)
    return next(new AppError('There is no message with that ID', 400));

  res.status(200).json({
    status: 'success',
    message: 'Message deleted successfully',
  });
});
