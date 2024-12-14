const multer = require('multer');
const sharp = require('sharp');

const Chat = require('../models/chatModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadChatPhoto = upload.single('chatphoto');

exports.resizeChatPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `chat-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/chats/${req.file.filename}`);
  next();
});

exports.createChat = catchAsync(async (req, res, next) => {
  console.log('creating Chat');
  const chat = await Chat.create({
    userId: req.user.id,
    chatUrl: req.body.chatUrl,
    chatName: req.body.chatName,
    chatPhoto: req.file.filename,
  });

  // if(!chat) return next(new AppError('Failed to create chat. Try again'))

  res.status(201).json({
    status: 'success',
    data: {
      chat,
    },
  });
});

exports.getMyChats = catchAsync(async (req, res, next) => {
  const chats = await Chat.find({ userId: req.user.id }).sort('-createdAt');

  if (chats.length === 0)
    return next(new AppError("Sorry! You don't have any chats yet."));

  res.status(200).json({
    status: 'success',
    results: chats.length,
    data: {
      chats,
    },
  });
});

//? will it be needed?
// exports.getChat = catchAsync(async (req, res, next) => {
//   const chat = await Chat.findByIdAndDelete(req.params.chatId);

//   res.status(200).json({
//     status: 'success',
//     data: {
//       chat,
//     },
//   });
// });

// User deletes one of his chat
exports.deleteChat = catchAsync(async (req, res, next) => {
  // const chat = await Chat.findByIdAndDelete(req.params.chatId);
  const chat = await Chat.findOneAndDelete({
    _id: req.params.chatId,
    userId: req.user.id, // Ensure only the owner can delete the chat
  });

  if (!chat) return next(new AppError('There is no chat with that ID', 400));

  await Message.deleteMany({ chatId: req.params.chatId });

  res.status(200).json({
    status: 'success',
    message: 'chat and releated messages are deleted successfully',
  });
});

exports.getChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findOne({
    _id: req.params.chatId,
    userId: req.user.id, // Ensure only the owner can access the chat
  });

  if (!chat) return next(new AppError('There is no chat with that ID.', 404));

  res.status(200).json({
    status: 'success',
    data: {
      chat,
    },
  });
});
