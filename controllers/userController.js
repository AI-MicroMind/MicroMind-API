const multer = require('multer');
const sharp = require('sharp');

const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`/var/uploads/img/users/${req.file.filename}`);
  next();
});

const filterObj = (obj, ...filterFields) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (filterFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // Return error when using it for password change
  if (req.body.password || req.body.confirmPassword)
    return next(new AppError('This route is not for updating passwords.', 400));

  // Filter out fields that is not allowed to be updated by user
  const filteredBody = filterObj(req.body, 'fullName', 'email');
  if (req.file)
    filteredBody.photo = `/var/uploads/img/users/${req.file.filename}`;

  // Update user and send response
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Data is updated successfully',
    data: {
      updatedUser,
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

//TODO Delete ME

//TODO Admin controllers
