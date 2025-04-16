const express = require('express');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/signup', authController.signup);
// router.get('/verify-email/:token', authController.verifyEmail);

router.post('/login', authController.login);
router.post('/admin-login', authController.adminLogin);

router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-Password/:token', authController.resetPassword);
router.get('/logout', authController.logout);

// Protect all next routes from guests
router.use(authController.protect);

router.get('/me', userController.getMe, userController.getUser);

router.patch(
  '/update-me',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

router.patch('/update-password', authController.updatePassword);

router.delete('/delete-me', userController.getMe, userController.deleteUser);

router.post('/invitation-codes', userController.generateInvitationCode);

// ADMIN ENDPOINTS
router.use(authController.restrictTo('admin'));

router.get('/:userId', userController.getUser);
// router.get('/', userController.getAllUsers);

module.exports = router;
