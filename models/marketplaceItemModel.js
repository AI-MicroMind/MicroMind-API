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
  photo: {
    type: String,
    default: 'default.jpeg',
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
  'MarketPlaceItem',
  marketplaceItemSchema
);

module.exports = MarketplaceItem;
