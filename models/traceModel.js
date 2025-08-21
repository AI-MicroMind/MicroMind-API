// models/traceModel.js
const mongoose = require('mongoose');

const tokenUsageSchema = new mongoose.Schema({
  promptTokens: Number,
  completionTokens: Number,
  totalTokens: Number,
  input_tokens: Number,
  output_tokens: Number,
  total_tokens: Number,
}, { _id: false }); // _id: false prevents sub-documents from getting their own ID

const traceSchema = new mongoose.Schema(
  {
    // In the future, we can link this to a user
    // user: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'User',
    // },
    chatflowId: {
      type: String,
      required: [true, 'A trace must have a chatflowId.'],
      trim: true,
    },
    sessionId: {
      type: String,
      required: [true, 'A trace must have a sessionId.'],
      trim: true,
    },
    runId: {
      type: String,
      required: [true, 'A trace must have a runId.'],
      unique: true, // Each run should be unique
    },
    tokens: {
      type: tokenUsageSchema,
      required: [true, 'A trace must include token usage.'],
    },
    cost: {
      type: Number,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const Trace = mongoose.model('Trace', traceSchema);

module.exports = Trace;