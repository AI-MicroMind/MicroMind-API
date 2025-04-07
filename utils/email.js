const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) Create Transporter
  const transporter = nodemailer.createTransport({
    // host: process.env.EMAIL_HOST,
    // port: process.env.EMAIL_PORT,
    service: 'gmail',
    auth: {
      // user: process.env.EMAIL_USERNAME,
      // pass: process.env.EMAIL_PASSWORD,
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // 2) Add Email options
  const mailOptions = {
    from: 'AI MicroMind <support@aimicromind.com>',
    to: options.email,
    subject: options.subject,
    // text: options.message,
    html: options.html,
  };

  // 3) Send Email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
