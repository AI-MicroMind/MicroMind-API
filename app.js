const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
// const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

// Parsing incoming requests
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Enable cors requests
app.use(cors());

// Logging requests
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(compression());

// Security middlewares
app.use(mongoSanitize());
app.use(helmet());
app.use(xss());
// app.use(hpp())

const limiter = rateLimit({
  windowMs: 15 * 1000 * 60,
  limit: 100,
  message: 'Too many requests, Try again later',
});

app.use('/api', limiter);

app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

module.exports = app;