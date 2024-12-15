const mongoose = require('mongoose');

const AppError = require('../utils/AppError');

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.ObjectId,
      ref: 'Chat',
      required: [true, 'A message must belongs to a chat'],
    },
    sender: {
      type: String,
      enum: ['user', 'bot'],
      required: [true, 'A message must have a sender.'],
    },
    text: {
      // For message content
      type: String,
    },
    // photo: {
    //   // For photos
    //   type: String,
    // },
    // voice: {
    //   // For voice messages
    //   type: String,
    // },
    // file: {
    //   // For files
    //   type: String,
    // },
    file: {
      type: String,
      fileType: {
        type: String,
        enum: ['photo', 'voice', 'file'],
      },
    },
    starred: {
      type: Boolean,
      default: false,
    },
    // createdAt: {
    //   type: Date,
    //   default: Date.now(),
    // },
  },
  {
    timestamps: true,
  }
);

// prevent empty messages from
// messageSchema.pre('save', function (next) {
//   if (!this.text && !this.file) {
//     return next(
//       new AppError('You cannot send empty message in the chat.', 400)
//     );
//   }
//   next();
// });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
