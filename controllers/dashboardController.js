const multer = require('multer');
const sharp = require('sharp');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Dashboard = require('../models/dashboardModel');
const Card = require('../models/cardModel');

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

exports.uploadDashboardPhoto = upload.single('photo');

exports.resizeDashboardPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `dashboard-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`/var/uploads/img/dashboards/${req.file.filename}`);
  next();
});

exports.createDashboard = catchAsync(async (req, res, next) => {
  const { title, photo, generateQueryUrl, ExecuteQueryUrl } = req.body;

  const dashboard = await Dashboard.create({
    title,
    photo: req.file
      ? `/uploads/img/dashboards/${req.file.filename}`
      : undefined,
    generateQueryUrl,
    ExecuteQueryUrl,
    user: req.user._id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      dashboard,
    },
  });
});

exports.getMyDashboards = catchAsync(async (req, res, next) => {
  const { search } = req.query;

  const filter = { user: req.user._id };
  if (search) {
    filter.title = { $regex: `\\b${search}`, $options: 'i' };
  }

  const dashboards = await Dashboard.find(filter)
    .select('-__v -updatedAt')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    length: dashboards.length,
    data: {
      dashboards,
    },
  });
});

exports.getDashboard = catchAsync(async (req, res, next) => {
  const dashboard = await Dashboard.findOne({
    _id: req.params.dashboardId,
    user: req.user._id, // Ensure only the owner can access the dashboard
  });

  if (!dashboard) {
    return next(new AppError('No dashboard found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      dashboard,
    },
  });
});

exports.deleteDashboard = catchAsync(async (req, res, next) => {
  const dashboard = await Dashboard.findOneAndDelete({
    _id: req.params.dashboardId,
    user: req.user._id, // Ensure only the owner can delete the dashboard
  });

  if (!dashboard) {
    return next(new AppError('No dashboard found with that ID.', 404));
  }

  res.status(204).json({
    status: 'success',
    message: 'Dashboard deleted successfully',
    data: null,
  });
});

//TODO generate query, execute query, refresh dashboard (execute all queries in cards)

async function query(data, chatUrl) {
  const response = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  console.log({ response });
  const result = await response.json();
  return result;
}

exports.generateQuery = catchAsync(async (req, res, next) => {
  const dashboard = await Dashboard.findById(req.params.dashboardId);

  if (!dashboard)
    return next(new AppError('No dashboard found with that ID.', 404));

  const generatedQuery = await query(
    {
      question: req.body.question,
    },
    dashboard.generateQueryUrl
  );

  console.log({ generatedQuery });

  const card = await Card.create({
    dashboard: dashboard._id,
    title: req.body.title,
    query: generatedQuery.text,
    chartType: req.body.chartType,
  });

  //? Add the card to the dashboard
  // dashboard.cards.push(card._id);
  // await dashboard.save();

  res.status(201).json({
    status: 'success',
    message: 'Query generated successfully',
    data: {
      card,
    },
  });
});

// Endpoint to execute all queries in the dashboard cards
exports.renderDashboard = catchAsync(async (req, res, next) => {
  const dashboard = await Dashboard.findById(req.params.dashboardId);
  if (!dashboard)
    return next(new AppError('No dashboard found with that ID.', 404));

  const cards = await Card.find({
    dashboard: req.params.dashboardId,
  });

  if (!cards || cards.length === 0) {
    return next(new AppError('No cards found for this dashboard.', 404));
  }

  // Execute all queries in the cards
  const results = await Promise.all(
    cards.map(async (card) => {
      const generatedQuery = await query(
        {
          question: card.query,
        },
        dashboard.ExecuteQueryUrl
      );

      return {
        cardId: card._id,
        title: card.title,
        question: card.question,
        chartType: card.chartType,
        query: card.query, // assuming the agent returns this
        chartType: card.chartType,
        chartData: generatedQuery.text, // if returned
      };
    })
  );

  console.log({ results });

  res.status(200).json({
    status: 'success',
    length: results.length,
    data: {
      dashboard,
      cards: results,
    },
  });
});

exports.deleteCard = catchAsync(async (req, res, next) => {
  const card = await Card.findOneAndDelete({
    _id: req.params.cardId,
    // dashboard: req.params.dashboardId,
  });

  if (!card) {
    return next(new AppError('No card found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Card deleted successfully',
  });
});
