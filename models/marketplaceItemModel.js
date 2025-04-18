const mongoose = require('mongoose');

const marketplaceItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A marketplace item must have a name.'],
  },
  description: {
    type: String,
    required: [true, 'A marketplace item must have a description.'],
  },
  details: {
    type: String,
    required: [true, 'A marketplace item must have details.'],
  },
  photo: {
    type: String,
    default: '/static/img/marketplace/default.jpg',
  },
  price: {
    type: Number,
    default: 0, // Free item by default
  },
  chatUrl: {
    type: String,
    required: [true, 'A marketplace item must have a chat URL.'],
  },
});

const MarketplaceItem = mongoose.model(
  'MarketplaceItem',
  marketplaceItemSchema
);

module.exports = MarketplaceItem;
