const express = require('express');

const messageController = require('../controllers/messageController');

const router = express.Router({ mergeParams: true });

router.post(
  '/',
  messageController.uploadMessagefile,
  messageController.sendMessage
);
router.get('/', messageController.loadChatMessages);
router.get('/:messageId/star', messageController.loadChatFromStarredMessage);

// router.get('/starred', messageController.getChatStarredMessages);

router.delete('/:messageId', messageController.deleteMessage);
router.patch('/:messageId/star', messageController.starMessage);

router.post(
  '/:messageId/export-to-docx',
  // express.text({ type: '*/*' }), // to parse the raw text
  // express.raw({ type: 'text/html' }),
  express.text({ type: 'text/html' }),
  messageController.exportToDocx
);

// router.post('/test-streaming', messageController.testStreaming);

module.exports = router;
