const express = require('express');

const messageController = require('../controllers/messageController');

const router = express.Router({ mergeParams: true });

router.post(
  '/',
  messageController.uploadMessagefile,
  messageController.sendMessage
);
router.get('/', messageController.loadChatMessages);

module.exports = router;
