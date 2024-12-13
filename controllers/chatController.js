const Chat = require('../models/chatModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.createChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.create({
    userId: req.user.id,
    chatUrl: req.body.chatUrl,
    chatName: req.body.chatName,
    chatPhoto: req.body.chatPhoto,
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

  if (!chats) return next(new AppError("Sorry! You don't have any chats yet."));

  res.status(200).json({
    status: 'success',
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

exports.deleteChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findByIdAndDelete(req.params.chatId);

  if (!chat) return next(new AppError('There is no chat with that ID', 400));

  res.status(200).json({
    status: 'success',
    message: 'chat deleted successfully',
  });
});

// exports.getChat = catchAsync(async(req,res,next)=>{
//   const messages =
// })
