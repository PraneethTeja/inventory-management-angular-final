const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticateUser, isAdmin } = require('../middleware/auth.middleware');

// Public routes
router.post('/whatsapp', orderController.createWhatsappOrder);

// Admin routes
router.get('/', authenticateUser, isAdmin, orderController.getAllOrders);
router.get('/stats', authenticateUser, isAdmin, orderController.getOrderStats);
router.get('/:id', authenticateUser, isAdmin, orderController.getOrderById);
router.post('/', authenticateUser, isAdmin, orderController.createOrder);
router.put('/:id/status', authenticateUser, isAdmin, orderController.updateOrderStatus);
router.put('/:id/whatsapp-status', authenticateUser, isAdmin, orderController.updateWhatsappStatus);

module.exports = router; 
