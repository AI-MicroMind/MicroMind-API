const express = require('express');

const authController = require('../controllers/authController');
const chatController = require('../controllers/chatController');
const messageController = require('../controllers/messageController');
const messageRouter = require('./messageRoutes');

const router = express.Router();

// Prevent guests from creating chats
router.use(authController.protect);

router.post(
  '/',
  chatController.uploadChatPhoto,
  chatController.resizeChatPhoto,
  chatController.createChat
);
router.get('/my-chats', chatController.getMyChats);
router
  .route('/:chatId')
  .get(chatController.getChat)
  .delete(chatController.deleteChat);

router.post('/:chatId/clear', chatController.clearChatHistory);

router.get('/:chatId/starred', messageController.getChatStarredMessages);

router.use('/:chatId/messages', messageRouter);

// router.patch('/messages/:messageId', messageController.starMessage);
// router.get('/:chatId', chatController.getChatMessages)

module.exports = router;
