const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please enter your full name'],
    minlength: 4,
    maxlength: 20,
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'Please enter your email'],
    validate: [validator.isEmail, 'Please enter a valid email'],
    lowercase: true,
  },
  photo: {
    type: String,
    default: '/static/img/users/default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },

  //TODO phone number
  phone: {
    type: String,
    required: [true, 'Please enter your phone number'],
    validate: {
      validator: function (value) {
        return validator.isMobilePhone(value, 'any', { strictMode: false });
      },
      message: 'Please enter a valid phone number',
    },
  },

  password: {
    type: String,
    required: [true, 'Please enter a password'],
    validate: {
      validator: function (value) {
        return validator.isStrongPassword(value, {
          minLength: 8,
          minLowercase: 0,
          minUppercase: 0,
          minNumbers: 0,
          minSymbols: 0,
        });
      },
      message: 'Password must be at least 8 charachters.',
    },
    select: false,
  },
  // password: {
  //   type: String,
  //   required: [true, 'Please enter a password'],
  //   minlength: 8,
  //   select: false,
  // },
  confirmPassword: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Password and Confirm Password do not match.',
    },
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  changedPasswordAt: Date,

  invitationCodes: {
    type: [
      {
        code: String,
        used: { type: Boolean, default: false },
      },
    ],
    default: [],
  },

  //   active: {
  //     type: Boolean,
  //     default: true,
  //     select: false
  //   }
});

// Hashing password at signup or changing password
userSchema.pre('save', async function (next) {
  // Check if the password is changed
  if (!this.isModified('password')) return next();
  // Hash the password with a cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // Delete the confirmPassword field
  this.confirmPassword = undefined;
  next();
});

// Adding password changing time
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.changedPasswordAt = Date.now() - 1000;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.changedPasswordAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.createVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  return verificationToken;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.changedPasswordAt) {
    const JWTDate = new Date(JWTTimestamp * 1000);

    // Means password has changed
    return JWTDate < this.changedPasswordAt;
  }

  // Means password has not changed
  return false;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
