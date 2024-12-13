const express = require('express');

const messageController = require('../controllers/messageController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/send-message/', messageController.sendMessage);
router.get('/', authController.protect, messageController.sendMessage);

module.exports = router;
