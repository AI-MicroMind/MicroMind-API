const multer = require('multer');
const sharp = require('sharp');

const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
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
    .toFile(`/var/uploads/img/chats/${req.file.filename}`);
  next();
});

exports.createChat = catchAsync(async (req, res, next) => {
  const { chatUrl, chatName } = req.body;

  // extracting the chat ID out of the page URL
  const chatUrlId = chatUrl.split('/canvas/')[1];

  const chatAPIUrl = `https://micromind-v2.onrender.com/api/v1/prediction/${chatUrlId}`;

  const chat = await Chat.create({
    userId: req.user.id,
    chatUrl: chatAPIUrl,
    chatName,
    chatPhoto: req.file
      ? `/var/uploads/img/chats/${req.file.filename}`
      : undefined,
  });

  // if(!chat) return next(new AppError('Failed to create chat. Try again'))

  res.status(201).json({
    status: 'success',
    data: {
      chat,
    },
  });
});

//TODO LATEST MESSAGE + Sort chat by updates +

exports.getMyChats = catchAsync(async (req, res, next) => {
  const { search } = req.query;
  const filter = { userId: req.user.id };
  if (search) {
    // make sure the search query is the start of chat name, case-insensitive
    filter.chatName = { $regex: `\\b${search}`, $options: 'i' };
  }
  const chats = await Chat.find(filter)
    .select('-__v -updatedAt')
    .sort('-createdAt');

  // if (chats.length === 0)
  //   return next(new AppError("Sorry! You don't have any chats yet."));

  const chatsWithLatestMessage = await Promise.all(
    chats.map(async (chat) => {
      const latestMessage = await Message.findOne({ chat: chat._id })
        .sort('-createdAt')
        .select('text file createdAt sender');
      return { ...chat._doc, latestMessage };
    })
  );

  // sort chat in descending order based on the latest message createdAt
  chatsWithLatestMessage.sort((a, b) => {
    // Compare latest message, and if there is no message compare to creation date
    const aTime = a.latestMessage ? a.latestMessage.createdAt : a.createdAt;
    const bTime = b.latestMessage ? b.latestMessage.createdAt : b.createdAt;
    return bTime - aTime;
  });

  res.status(200).json({
    status: 'success',
    results: chats.length,
    data: {
      chats: chatsWithLatestMessage,
    },
  });
});

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
