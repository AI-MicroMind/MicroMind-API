const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');
const mongoose = require('mongoose');

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
  const splitChatUrl = chatUrl.split('/canvas/');

  const chatAPIUrl = `${splitChatUrl[0]}/api/v1/prediction/${splitChatUrl[1]}`;

  const chat = await Chat.create({
    userId: req.user.id,
    chatUrl: chatAPIUrl,
    chatName,
    chatPhoto: req.file ? `/uploads/img/chats/${req.file.filename}` : undefined,
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

exports.clearChatHistory = catchAsync(async (req, res, next) => {
  // Start a session to ensure that the chat is deleted only if all messages are deleted
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const chat = await Chat.findById(req.params.chatId).session(session);

    if (!chat) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('There is no chat with that ID.', 404));
    }

    // clone the chat to the new Chat
    const newChat = await Chat.create(
      [{ ...chat.toObject(), _id: undefined }],
      { session }
    );

    // delete the old chat
    await Chat.findByIdAndDelete(chat._id).session(session);

    // delete all messages related to the old chat
    await Message.deleteMany({ chat: chat._id }).session(session);

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      message: 'Chat cleared successfully',
      newChat: newChat[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(new AppError('Failed to clear chat. Try again.', 500));
  }
});

exports.setDefaultChat = catchAsync(async (req, res, next) => {
  // remove default from all chats
  const userDefaultChat = await Chat.findOneAndUpdate(
    { userId: req.user.id, default: true },
    { default: false },
    { new: true }
  );

  // if (userDefaultChat.length > 0) {
  //   // set all chats to default false
  //   await Chat.updateMany({ userId: req.user.id }, { default: false });
  // }

  const newDefaultChat = await Chat.findOneAndUpdate(
    {
      _id: req.params.chatId,
      userId: req.user.id,
    },
    { default: true },
    { new: true }
  );

  if (!newDefaultChat)
    return next(new AppError('There is no chat with that ID.', 404));

  res.status(200).json({
    status: 'success',
    data: {
      newDefaultChat,
    },
  });
});

exports.getDefaultChat = catchAsync(async (req, res, next) => {
  const defaultChat = await Chat.findOne({
    userId: req.user.id,
    default: true,
  });

  //? if there is no default chat, return error?
  // if (!defaultChat)
  //   return next(new AppError('You do not have a default chat.', 404));

  res.status(200).json({
    status: 'success',
    data: {
      defaultChat,
    },
  });
});

exports.unsetDefaultChat = catchAsync(async (req, res, next) => {
  const defaultChat = await Chat.findOneAndUpdate(
    {
      _id: req.params.chatId,
      userId: req.user.id,
      default: true,
    },
    { default: false },
    { new: true }
  );

  if (!defaultChat)
    return next(new AppError('There is no chat with that ID.', 404));

  res.status(200).json({
    status: 'success',
    message: 'Chat is no longer default',
    data: null,
  });
});

exports.updateChatName = catchAsync(async (req, res, next) => {
  const { chatName } = req.body;
  const updatedChat = await Chat.findOneAndUpdate(
    { _id: req.params.chatId, userId: req.user.id },
    { chatName },
    { new: true }
  );

  if (!updatedChat)
    return next(new AppError('There is no chat with that ID.', 404));

  res.status(200).json({
    status: 'success',
    data: {
      updatedChat,
    },
  });
});

exports.getChatFlows = catchAsync(async (req, res, next) => {
  // send axios request to the chatgpt api with the userId and get the flows
  const data = await axios.get(
    `https://aimicromind-platform-2025.onrender.com/api/v1/chatflows`
    // {
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    //   },
    //   params: {
    //     userId: req.user.id,
    //   },
    // }
  );
  console.log(data);
  res.status(200).json({
    status: 'success',
    data,
  });
});
