const TourRobot = require('../models/tourRobotModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Post  to tour robot
exports.addTour = catchAsync(async (req, res, next) => {
  const tourRobot = await TourRobot.findOne({ status: 'idle' }).select('-_id');

  //   if (tourRobot.status === 'equipped')
  //     return next(new AppError('Sorry! The robot is currently busy.', 400));

  if (!tourRobot)
    return next(new AppError('Sorry! The robot is currently busy.', 400));

  if (!req.body.session_id)
    return next('Please provide session ID to add tour.');

  tourRobot.trigger = true;
  tourRobot.status = 'equipped';
  tourRobot.session_id = req.body.session_id;

  await tourRobot.save();

  res.status(200).json({
    status: 'success',
    tourRobot,
  });
});

exports.getRobot = catchAsync(async (req, res, next) => {
  const tourRobot = await TourRobot.findOne();

  res.status(200).json({
    status: 'success',
    tourRobot,
  });

  tourRobot.trigger = false;
  tourRobot.session_id = undefined;
  await tourRobot.save();
  console.log(tourRobot);
});

// Idle robot after tour ends
exports.idleRobot = catchAsync(async (req, res, next) => {
  const tourRobot = await TourRobot.findOneAndUpdate(
    {},
    { status: 'idle' }
  ).select('-_id');

  res.status(200).json({
    status: 'success',
    tourRobot,
  });
});
