const multer = require('multer');
const sharp = require('sharp');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const MarketplaceItem = require('../models/marketplaceItemModel');
const Chat = require('../models/chatModel');
const APIFeatures = require('../utils/apiFeatures');

// const multerStorage = multer.diskStorage();

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, '/var/uploads/chat-uploads/'); // Specify the directory to store uploaded files
//   },
//   filename: (req, file, cb) => {
//     cb(null, `file-${Date.now()}-${file.originalname}`); // Generate a unique filename
//   },
// });

// Get all marketplace items
exports.getMarketplace = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(MarketplaceItem.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .search('name')
    .paginate();

  const items = await features.query;

  // const { search } = req.query;
  // const filter = {};
  // if (search) {
  //   // make sure the search query is the start of chat name, case-insensitive
  //   filter.name = { $regex: `\\b${search}`, $options: 'i' };
  // }

  // const items = await MarketplaceItem.find(filter).sort('createdAt');

  res.status(200).json({
    status: 'success',
    results: items.length,
    data: {
      items,
    },
  });
});

exports.getMarketplaceItem = catchAsync(async (req, res, nex) => {
  const item = await MarketplaceItem.findById(req.params.itemId);

  if (!item)
    return next(
      new AppError('There is no marketplace item with that ID.', 404)
    );

  res.status(200).json({
    status: 'success',
    data: {
      item,
    },
  });
});

exports.useMarketplaceItem = catchAsync(async (req, res, next) => {
  const item = await MarketplaceItem.findById(req.params.itemId);

  if (!item)
    return next(
      new AppError('There is not marketplace item with that ID.', 404)
    );

  if (item.price > 0)
    return next(new AppError('Paid chatbots are not available yet.', 400));

  const userChats = await Chat.find({
    userId: req.user.id,
    chatUrl: item.chatUrl,
  });

  // LIMIT 3 chats per user for each marketplace item
  if (userChats.length >= 3)
    return next(
      new AppError(
        'You have exceeded the limit chats for that marketplace item (3).',
        400
      )
    );

  const chat = await Chat.create({
    userId: req.user.id,
    chatUrl: item.chatUrl,
    chatName: req.body.chatName || item.name,
    chatPhoto: req.body.chatPhoto || item.photo,
  });

  res.status(201).json({
    status: 'success',
    data: {
      chat,
    },
  });
});

//? ADMIN ONLY ENDPOINTS

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/var/uploads/img/marketplace/'); // Specify the directory to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, `marketplace-${Date.now()}-${file.originalname}`); // Generate a unique filename
  },
}); // Store files in memory for processing

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
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit image size to 5MB
});

exports.uploadMarketplaceItemPhoto = upload.single('photo');

//This middleware is for admin only
exports.createMarketplaceItem = catchAsync(async (req, res, next) => {
  const parsedFields = req.body.requiredFields
    ? JSON.parse(req.body.requiredFields)
    : undefined;

  const newItem = await MarketplaceItem.create({
    name: req.body.name,
    description: req.body.description,
    details: req.body.details,
    price: req.body.price || 0, // Default to 0 if not provided
    chatUrl: req.body.chatUrl,
    photo: req.file
      ? `/uploads/img/marketplace/${req.file.filename}`
      : undefined,
    userId: req.user.id, // Assuming the user creating the item is the one making the request
    requiredFields: parsedFields, // Optional field for required form fields
  });

  res.status(201).json({
    status: 'success',
    data: {
      newItem,
    },
  });
});

exports.deleteMarketplaceItem = catchAsync(async (req, res, next) => {
  const item = await MarketplaceItem.findByIdAndDelete(req.params.itemId);

  if (!item)
    return next(
      new AppError('There is no marketplace item with that ID.', 404)
    );

  res.status(204).json({
    status: 'success',
    message: 'Marketplace item deleted successfully.',
    data: null,
  });
});

// exports.updateMarketplaceItem = catchAsync(async (req, res, next) => {
//   const parsedFields = req.body.requiredFields
//     ? JSON.parse(req.body.requiredFields)
//     : undefined;

//     const item = await MarketplaceItem.findById(req.params.itemId);

//     if (!item)
//       return next(
//         new AppError('There is no marketplace item with that ID.', 404)
//       );

//       const
//   const item = await MarketplaceItem.findByIdAndUpdate(
//     req.params.itemId,
//     {
//       name: req.body.name,
//       description: req.body.description,
//       details: req.body.details,
//       price: req.body.price || 0, // Default to 0 if not provided
//       chatUrl: req.body.chatUrl,
//       photo: req.file
//         ? `/var/uploads/img/marketplace/${req.file.filename}`
//         : undefined,
//       requiredFields: parsedFields, // Optional field for required form fields
//     },
//     {
//       new: true, // Return the updated document
//       runValidators: true, // Run validation on the updated fields
//     }
//   );

//   res.status(200).json({
//     status: 'success',
//     data: {
//       item,
//     },
//   });
// });
