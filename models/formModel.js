const mongoose = require('mongoose');

// usernam - email - phone - country - company - jobTitle - companyIndustry - clientId- clientSecret
// const formSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: [true, 'Please provide the user'],
//     },
//     marketplaceItem: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'MarketplaceItem',
//       required: [true, 'Please provide the marketplace item'],
//     },
//     companyName: {
//       type: String,
//       minLength: 3,
//       maxLength: 30,
//       required: [true, 'Please provide the company name'],
//     },
//     country: {
//       type: String,
//       required: [true, 'Please provide the country of your company'],
//     },
//     jobTitle: {
//       type: String,
//       minLength: 3,
//       maxLength: 30,
//       required: [true, 'Please provide your job title'],
//     },
//     companyIndustry: {
//       type: String,
//       minLength: 3,
//       maxLength: 50,
//       required: [true, 'Please provide the industry of your company'],
//     },
//     clientId: {
//       type: String,
//       required: [true, 'Please provide the client id'],
//     },
//     clientSecret: {
//       type: String,
//       required: [true, 'Please provide the client secret'],
//     },
//     status: {
//       type: String,
//       enum: ['pending', 'approved', 'rejected'],
//       default: 'pending',
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

//TODO: Implementing dynamic form responses
const formSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide the user'],
    },
    marketplaceItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketplaceItem',
      required: [true, 'Please provide the marketplace item'],
    },
    responses: {
      // This field will store the responses to the form questions
      type: Map,
      of: String,
      required: [true, 'Please provide the responses'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

formSchema.pre(/^find/, async function (next) {
  this.populate({
    path: 'user',
    select: 'fullName email photo phone',
  });

  next();
});

formSchema.pre(/^find/, async function (next) {
  this.populate({
    path: 'marketplaceItem',
    select: 'name price photo',
  });

  next();
});

const Form = mongoose.model('Form', formSchema);

module.exports = Form;
