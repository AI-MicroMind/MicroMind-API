// routes/traceRoutes.js
const express = require('express');
const traceController = require('../controllers/traceController');
const authController = require('../controllers/authController');

const router = express.Router();

// The POST endpoint for creating a trace should be open, as it's called
// server-to-server and won't have a user token.
router.post('/', traceController.createTrace);

// However, the GET endpoint to view all traces should be protected
// and restricted to admins, just like your other GET all endpoints.
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.get('/', traceController.getAllTraces);

module.exports = router;