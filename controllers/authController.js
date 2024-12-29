const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const SendEmail = require('../utils/email');
const User = require('../models/userModel');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expiresIn: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV == 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  });
  createSendToken(newUser, 201, res);
});

// exports.signup = catchAsync(async (req, res, next) => {
// const { fullName, email, password, confirmPassword } = req.body;
// const newUser = await User.create({
//   fullName,
//   email,
//   password,
//   confirmPassword,
// });
//   const newUser = await User.create({
//     fullName: req.body.fullName,
//     email: req.body.email,
//     password: req.body.password,
//     confirmPassword: req.body.confirmPassword,
//   });

//   console.log(newUser);

//   // Create verification token
//   const verificationToken = newUser.createVerificationToken();
//   await newUser.save({ validateBeforeSave: false });

//   // send email with verification token
//   const verificationUrl = `${req.protocol}://${req.get(
//     'host'
//   )}/api/v1/users/verify-email/${verificationToken}`;

//   const message = `Verify your email by clicking the following link: ${verificationUrl}`;

//   try {
//     await SendEmail({
//       email: newUser.email,
//       subject: 'AI MicroMind Email Verification',
//       message,
//     });

//     res.status(200).json({
//       status: 'success',
//       message: 'Token sent to email',
//     });
//   } catch (err) {
//     newUser.verificationToken = undefined;
//     await newUser.save({ validateBeforeSave: false });
//     console.log(err);
//     return next(
//       new AppError('There is an error sending the email. Try again later.', 500)
//     );
//   }
// });

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    verificationToken: hashedToken,
    //? expire date?
  });
  if (!user) return next('Token is invalid', 400);
  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  // Send token after email verification
  createSendToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError('Please enter your email and password', 400));

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Invalid email or password. Try again.', 400));
  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie('jwt', 'LoggedOut', {
    expiresIn: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res
    .status(200)
    .json({ status: 'success', message: 'Logged out successfully' });
});

// RESET PASSWORD
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Check if the email in the database
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('There is no user with this email address', 400));

  // 2) Generate random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send email to user
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/ap1/v1/resetPassword/${resetToken}`;
  const message = `Forgot your password? You can reset your password using the next link: ${resetUrl}`;
  try {
    await SendEmail({
      email: user.email,
      subject: 'AI MicroMind Reset Password',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Reset password token is sent to email.',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await newUser.save({ validateBeforeSave: false });
    console.log(err);
    return next(
      new AppError('There is an error sending the email. Try again later.', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get the user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // If token is not expired, or the user doesn't exists, reset your password
  if (!user) return next(new AppError('Token is invalid or expired.', 401));

  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateModifiedOnly: true });

  //TODO Update changedPassword at

  createSendToken(user, 200, res);
});

// To protect API endpoints from unsigned in users
exports.protect = catchAsync(async (req, res, next) => {
  // Get the token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token)
    return next(
      new AppError('You are not logged in. Please login to get access.')
    );

  // Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  console.log({ decoded });

  // console.log(decoded);

  // check if the user still available
  const currentUser = await User.findById(decoded.id);

  if (!currentUser)
    return next(
      new AppError('The user belonging to this token is no longer exist', 401)
    );

  //? Check if user changed password after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError('Password was changed recently. Please login again.', 401)
    );

  req.user = currentUser;
  next();
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get the user with password from collection
  const user = await User.findById(req.user.id).select('+password');

  if (req.body.currentPassword === req.body.newPassword)
    return next(
      new AppError(
        'New password cannot be the same as the current password.',
        400
      )
    );

  // 2) Check if POSTed password matches user's password
  if (!(await user.correctPassword(req.body.currentPassword, user.password)))
    return next(
      new AppError('Current password is not correct. Please try again.', 401)
    );

  // 3) If so, update user password
  user.password = req.body.newPassword;
  user.confirmPassword = req.body.confirmPassword;
  await user.save();

  // log the user in
  createSendToken(user, 200, res);
});
