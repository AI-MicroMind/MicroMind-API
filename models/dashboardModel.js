const mongoose = require('mongoose');

const dashboardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A dashboard must have a title.'],
      minlength: 2,
      maxlength: 50,
    },
    photo: {
      type: String,
      default: '/static/img/dashboards/default.jpg',
    },
    generateQueryUrl: {
      // URL to generate query
      type: String,
      required: [true, 'A dashboard must have a query URL.'],
    },
    ExecuteQueryUrl: {
      type: String,
      required: [true, 'A dashboard must have an execute URL.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A dashboard must belong to a user.'],
    },
    cards: [
      {
        question: {
          type: String,
          required: [true, 'A card must have a question.'],
        },

        chartType: {
          type: String,
          enum: ['bar', 'line', 'pie', 'radar', 'doughnut'],
          required: [true, 'A card must have a chart type.'],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Dashboard = mongoose.model('Dashboard', dashboardSchema);

module.exports = Dashboard;
