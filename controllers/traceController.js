// controllers/traceController.js
const Trace = require('../models/traceModel');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

// This function will be called by our Next.js API route
exports.createTrace = catchAsync(async (req, res, next) => {
  const newTrace = await Trace.create({
    chatflowId: req.body.chatflowId,
    sessionId: req.body.sessionId,
    runId: req.body.runId,
    tokens: req.body.tokens,
    cost: req.body.cost,
  });

  res.status(201).json({
    status: 'success',
    data: {
      trace: newTrace,
    },
  });
});

// This function will be called by the Analytics page in our frontend
exports.getAllTraces = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Trace.find(), req.query)
    .filter()
    .sort('-createdAt') // Sort by newest first
    .limitFields()
    .paginate();

  const traces = await features.query;

  res.status(200).json({
    status: 'success',
    results: traces.length,
    data: {
      traces, // The frontend expects an array named 'traces'
    },
  });
});