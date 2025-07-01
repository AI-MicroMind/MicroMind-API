const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  dashboard: {
    type: mongoose.Schema.ObjectId,
    ref: 'Dashboard',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'A card must have a title'],
  },
  query: {
    type: String,
    required: [true, 'A card must have a query'],
  },
  chartType: {
    type: String,
    // enum: ['bar', 'line', 'pie', 'table'],
    default: 'bar',
  },
});

const Card = mongoose.model('Card', cardSchema);
module.exports = Card;
