const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    //? chatID: {}
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A chat must belong to some user.'],
    },
    chatUrl: {
      type: String,
      required: [true, 'Please enter the url of the chat.'],
    },
    chatName: {
      type: String,
      minLength: 2,
      maxLength: 100,
      required: [true, 'Please enter the name you want for this chat.'],
    },
    chatPhoto: {
      type: String,
      // default: 'chat-default.jpg',
    },
  },
  { timestamps: true }
);

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
