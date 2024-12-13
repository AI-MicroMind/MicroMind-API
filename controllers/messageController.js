const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const Message = require('../models/messageModel');

async function query(data) {
  const response = await fetch(
    'https://chatflow-aowb.onrender.com/api/v1/prediction/307171e5-e3d9-4e15-9494-ff5971225fe5',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );
  const result = await response.json();
  return result;
}

//..........................

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { text, photo, voice } = req.body;

  const [botResponse, userMessage] = await Promise.all([
    query({
      question: req.body.text || '',
      overrideConfig: {
        systemMessage: 'example',
        maxIterations: 1,
        sessionId: 'example',
        memoryKey: 'example',
      },
    }),
    Message.create({
      chat: req.params.chatId,
      sender: 'user',
      text,
      photo,
      voice,
    }),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      botResponse,
    },
  });

  // Save bot response to database
  Message.create({
    chat: req.params.chatId,
    sender: 'bot',
    text: botResponse.text,
  });
});

exports.loadChatMessages = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const messages = await Message.find({ chat: req.params.chatId })
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: 'success',
    data: {
      messages,
    },
  });
});

//-------------------------------------------------------------

// const {FlowiseClient} =  require('flowise-sdk')

// async function testStreaming() {
//   const client = new FlowiseClient({ baseUrl: 'http://localhost:3000' });

//   try {
//     // For streaming prediction
//     const prediction = await client.createPrediction({
//       chatflowId: '<chatflow-id>',
//       question: 'What is the capital of France?',
//       streaming: true,
//     });

//     for await (const chunk of prediction) {
//       // {event: "token", data: "hello"}
//       console.log(chunk);
//     }
//   } catch (error) {
//     console.error('Error:', error);
//   }
// }

// // Run streaming test
// testStreaming();
