const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const MarketplaceItem = require('../models/marketplaceItemModel');
const Chat = require('../models/chatModel');

//TODO Create Marketplace item (ADMIN ONLY)
exports.createMarketplaceItem = catchAsync(async (req, res, next) => {
  const newItem = await MarketplaceItem.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      newItem,
    },
  });
});

// Get all marketplace items
exports.getMarketplace = catchAsync(async (req, res, next) => {
  const { search } = req.query;
  const filter = {};
  if (search) {
    // make sure the search query is the start of chat name, case-insensitive
    filter.name = { $regex: `\\b${search}`, $options: 'i' };
  }

  const items = await MarketplaceItem.find(filter).sort('createdAt');

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
