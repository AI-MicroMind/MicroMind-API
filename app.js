const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
// const xss = require('xss-clean');
// const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const traceRouter = require('./routes/traceRoutes');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const chatRouter = require('./routes/chatRoutes');
const marketplaceRouter = require('./routes/marketplaceRoutes');
const formRouter = require('./routes/formRoutes');
const dashboardRouter = require('./routes/dashboardRoutes');

const app = express();

// Serve public folder for static files like default images
app.use('/static', express.static(path.join(__dirname, 'public')));

// Serve /var/uploads for user-uploaded files
// app.use('/uploads', express.static(path.join('var/uploads')));
app.use('/uploads', express.static('/var/uploads'));

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
// app.use(xss());
// app.use(hpp())



const limiter = rateLimit({
  windowMs: 15 * 1000 * 60,
  limit: 100,
  message: 'Too many requests, Try again later',
});

app.set('trust proxy', 1); // Enable trust for first proxy (like Render's reverse proxy)

app.use('/api', limiter);

app.use('/api/v1/users', userRouter);
app.use('/api/v1/chats', chatRouter);
app.use('/api/v1/marketplace', marketplaceRouter);
app.use('/api/v1/forms', formRouter);
app.use('/api/v1/dashboards', dashboardRouter);
app.use('/api/v1/traces', traceRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
