const express = require('express');

const formController = require('../controllers/formController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all next routes from guests
router.use(authController.protect);

router.post('/', formController.createForm);
router.get('/my-forms', formController.getMyForms);
router.get('/:formId', formController.getForm);

// ADMIN ENDPOINTS
router.use(authController.restrictTo('admin'));

router.get('/', formController.getAllForms);
router.patch('/:formId', formController.updateFormStatus);
router.delete('/:formId', formController.deleteForm);
module.exports = router;
