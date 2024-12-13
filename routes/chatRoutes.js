const express = require('express');

const authController = require('../controllers/authController');
const chatController = require('../controllers/chatController');

const router = express.Router();

// Prevent guests from creating chats
router.use(authController.protect);

router.post('/', chatController.createChat);
router.get('/my-chats', chatController.getMyChats);
router.delete('/:chatId', chatController.deleteChat);

// router.get('/:chatId', chatController.getChatMessages)

module.exports = router;
