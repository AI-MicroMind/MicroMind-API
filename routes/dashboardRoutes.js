const dashboardController = require('../controllers/dashboardController');
const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.get('/my-dashboards', dashboardController.getMyDashboards);

router.post(
  '/',
  dashboardController.uploadDashboardPhoto,
  dashboardController.resizeDashboardPhoto,
  dashboardController.createDashboard
);

router
  .route('/:dashboardId')
  .get(dashboardController.getDashboard)
  .delete(dashboardController.deleteDashboard);
//TODO implement updateDashboard

// Dashboard cards routes
router.post('/:dashboardId/generate-query', dashboardController.generateQuery);
router.get('/:dashboardId/render', dashboardController.renderDashboard);
router.delete('/cards/:cardId', dashboardController.deleteCard);

module.exports = router;
