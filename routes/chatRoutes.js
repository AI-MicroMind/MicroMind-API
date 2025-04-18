const express = require('express');

const authController = require('../controllers/authController');
const chatController = require('../controllers/chatController');
const messageController = require('../controllers/messageController');
const messageRouter = require('./messageRoutes');

const router = express.Router();

// Prevent guests from creating chats
router.use(authController.protect);

router.get('/default', chatController.getDefaultChat);

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

router.post('/:chatId/default', chatController.setDefaultChat);
router.post('/:chatId/unset-default', chatController.unsetDefaultChat);
router.patch('/:chatId', chatController.updateChatName);
router.patch;

router.use('/:chatId/messages', messageRouter);

// router.patch('/messages/:messageId', messageController.starMessage);
// router.get('/:chatId', chatController.getChatMessages)

module.exports = router;
