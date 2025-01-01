const express = require('express');
const tourRobotController = require('../controllers/tourRobotController');

const router = express.Router();

router.get('/trigger', tourRobotController.getRobot);
router.post('/add-tour', tourRobotController.addTour);
router.patch('/idle', tourRobotController.idleRobot);

module.exports = router;
