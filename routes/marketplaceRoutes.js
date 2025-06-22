const express = require('express');

const marketplaceController = require('../controllers/marketplaceController');
const authController = require('../controllers/authController');

const router = express.Router();

// Allow marketplace for only signed users
router.use(authController.protect);

router.get('/', marketplaceController.getMarketplace);
router.get('/:itemId', marketplaceController.getMarketplaceItem);
router.post('/:itemId/use', marketplaceController.useMarketplaceItem);

//TODO Restrict to admin only
router.use(authController.restrictTo('admin'));

router.post(
  '/',
  marketplaceController.uploadMarketplaceItemPhoto,
  marketplaceController.createMarketplaceItem
);

router.delete('/:itemId', marketplaceController.deleteMarketplaceItem);

module.exports = router;
