const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) Create Transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) Add Email options
  const mailOptions = {
    from: 'AI MicroMind <support@micromind.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html
  };

  // 3) Send Email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
