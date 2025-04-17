const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticateUser, isAdmin } = require('../middleware/auth.middleware');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/category/:category', productController.getProductsByCategory);
router.get('/:id', productController.getProductById);

// Protected admin routes
router.post('/', authenticateUser, isAdmin, productController.createProduct);
router.put('/:id', authenticateUser, isAdmin, productController.updateProduct);
router.delete('/:id', authenticateUser, isAdmin, productController.deleteProduct);

module.exports = router; 
