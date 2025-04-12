const Form = require('../models/formModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const APIFeatures = require('../utils/apiFeatures');

exports.createForm = catchAsync(async (req, res, next) => {
  const form = await Form.create({
    user: req.user._id,
    marketplaceItem: req.body.marketplaceItem,
    companyName: req.body.companyName,
    country: req.body.country,
    jobTitle: req.body.jobTitle,
    companyIndustry: req.body.companyIndustry,
    clientId: req.body.clientId,
    clientSecret: req.body.clientSecret,
  });

  res.status(201).json({
    status: 'success',
    data: {
      form,
    },
  });
});

exports.getMyForms = catchAsync(async (req, res, next) => {
  const forms = await Form.find({ user: req.user._id })
    .select('-__v -updatedAt')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: forms.length,
    data: {
      forms,
    },
  });
});

// ADMIN ENDPOINTS

exports.getAllForms = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Form.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .search('companyName')
    .paginate();

  const forms = await features.query;

  res.status(200).json({
    status: 'success',
    results: forms.length,
    data: {
      forms,
    },
  });
});

exports.getForm = catchAsync(async (req, res, next) => {
  let form;
  if (req.user.role !== 'admin') {
    form = await Form.findOne({
      _id: req.params.formId,
      user: req.user._id,
    });
  } else {
    form = await Form.findById(req.params.formId);
  }

  if (!form) {
    return next(new AppError('No form found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      form,
    },
  });
});

exports.updateFormStatus = catchAsync(async (req, res, next) => {
  console.log('update form status....');
  const form = await Form.findByIdAndUpdate(
    req.params.formId,
    { status: req.body.status },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!form) {
    return next(new AppError('No form found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      form,
    },
  });
});

exports.deleteForm = catchAsync(async (req, res, next) => {
  const form = await Form.findByIdAndDelete(req.params.formId);

  if (!form) {
    return next(new AppError('No form found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    message: 'Form deleted successfully',
    data: null,
  });
});
