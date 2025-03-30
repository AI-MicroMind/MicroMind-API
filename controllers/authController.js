const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const SendEmail = require('../utils/email');
const User = require('../models/userModel');
const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');

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

//? Signup using invitation code
exports.signup = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      invitationCode,
      phone,
    } = req.body;

    if (!invitationCode) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Please enter an invitation code', 400));
    }
    // Check if the invitation code is valid
    const existingUser = await User.findOne({
      invitationCodes: { $elemMatch: { code: invitationCode, used: false } },
    }).session(session);
    // const existingUser = await User.findOne({
    //   'invitationCodes.code': invitationCode,
    //   'invitationCodes.used': false,
    // });

    if (!existingUser) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Sorry! This code is invalid.', 400));
    }

    const newUser = (
      await User.create(
        [
          {
            fullName,
            email,
            password,
            confirmPassword,
            phone,
          },
        ],
        { session }
      )
    )[0];

    // Mark the invitation code as used
    await User.updateOne(
      { 'invitationCodes.code': invitationCode },
      { 'invitationCodes.$.used': true },
      { session }
    );

    // Create a default chat linked to the new user
    const chat = (
      await Chat.create(
        [
          {
            chatName: 'AI MicroMind',
            userId: newUser._id,
            chatUrl:
              'https://aimicromind-platform-2025.onrender.com/api/v1/prediction/5df08a83-588c-4bf6-be83-057f232675ab',
            chatPhoto: '/static/img/chats/default.jpg',
          },
        ],
        { session }
      )
    )[0];

    // Create a hello message
    await Message.create(
      [
        {
          chat: chat._id,
          sender: 'bot',
          text: `Hello ${newUser.fullName.split(' ')[0]}! 👋
          Welcome to **AI MicroMind**! How can i help you today? 🤩`,
          // I am AI MicroMind, your personal assistant. I am here to help you with your tasks and provide you with the information you need. You can ask me anything, and I will do my best to assist you.😅`,
        },
      ],
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    createSendToken(newUser, 201, res);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
    // return next(new AppError('Signup failed, please try again.', 500));
  }
});

//? Normal Signup
// exports.signup = catchAsync(async (req, res, next) => {
//   const newUser = await User.create({
//     fullName: req.body.fullName,
//     email: req.body.email.toLowerCase(),
//     password: req.body.password,
//     confirmPassword: req.body.confirmPassword,
//   });
//   createSendToken(newUser, 201, res);
// });

//? SignUp with email verification
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

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password'
  );

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Invalid email or password. Try again.', 400));
  createSendToken(user, 200, res);
});

exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError('Please enter your email and password', 400));

  const user = await User.findOne({
    email: email.toLowerCase(),
    role: 'admin',
  }).select('+password');

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
      // email: user.email,
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
    // await newUser.save({ validateBeforeSave: false });
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
      new AppError('You are not logged in. Please login to get access.', 401)
    );

  // Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // console.log({ decoded });

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

// Restrict endpoint to specific role
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError('You do not have the permission for this action', 403)
      );
    next();
  };
};

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
