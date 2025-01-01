const mongoose = require('mongoose');

const tourRobotModel = new mongoose.Schema({
  trigger: Boolean,
  status: {
    type: String,
    enum: ['idle', 'equipped'],
    default: 'idle',
  },
  session_id: String,
});

const TourRobot = mongoose.model('TourRobot', tourRobotModel);

module.exports = TourRobot;
