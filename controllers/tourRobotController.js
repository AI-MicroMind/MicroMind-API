const TourRobot = require('../models/tourRobotModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Post  to tour robot
exports.addTour = catchAsync(async (req, res, next) => {
  const tourRobot = await TourRobot.findOne();

  //   if (tourRobot.status === 'equipped')
  //     return next(new AppError('Sorry! The robot is currently busy.', 400));

  // if (tourRobot)
  //   return next(new AppError('Sorry! The robot is currently busy.', 400));

  console.log(req.body);
  console.log({ tourRobot });
  // if (!req.body.session_id)
  //   return next('Please provide session ID to add tour.');

  let message =
    tourRobot.status === 'equipped'
      ? 'Sorry, the robot is currently in another tour. Please wait.'
      : 'Your tour begins now.';

  tourRobot.trigger = true;
  tourRobot.status = 'equipped';
  tourRobot.session_id = req.body.session_id || '123';

  await tourRobot.save();

  res.status(200).json({
    status: 'success',
    tourRobot,
    message,
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
    { status: 'idle' },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    tourRobot,
  });
});
