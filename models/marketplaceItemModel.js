const mongoose = require('mongoose');

// const marketplaceItemSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: [true, 'A marketplace item must have a name.'],
//   },
//   description: {
//     type: String,
//     required: [true, 'A marketplace item must have a description.'],
//   },
//   details: {
//     type: String,
//     required: [true, 'A marketplace item must have details.'],
//   },
//   photo: {
//     type: String,
//     default: '/static/img/marketplace/default.jpg',
//   },
//   price: {
//     type: Number,
//     default: 0, // Free item by default
//   },
//   chatUrl: {
//     type: String,
//     required: [true, 'A marketplace item must have a chat URL.'],
//   },
// });

//TODO: Implementing marketplace item model
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
  // This field will store the required fields required for the form
  requiredFields: {
    type: [
      {
        name: {
          type: String,
          required: [true, 'A required field must have a name.'],
        },
        label: {
          type: String,
          required: [true, 'A required field must have a label.'],
        },
        type: {
          type: String,
          enum: ['text', 'select'],
          required: [true, 'A required field must have a type.'],
        },
        options: {
          type: [String],
          required: function () {
            return this.type === 'select'; // Options are only required for select type
          },
        },
      },
    ],
    required: [true, 'A marketplace item must have required fields.'],
    //   function () {
    //   return this.price > 0; // Required fields are only needed for paid items
    // },
  },
});

const MarketplaceItem = mongoose.model(
  'MarketplaceItem',
  marketplaceItemSchema
);

module.exports = MarketplaceItem;
