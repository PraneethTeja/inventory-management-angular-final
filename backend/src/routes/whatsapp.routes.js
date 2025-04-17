const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const { authenticateUser, isAdmin } = require('../middleware/auth.middleware');

// Public routes
router.post('/send-order', whatsappController.sendOrderToWhatsApp);
router.post('/webhook', whatsappController.webhookHandler);
router.get('/redirect/:orderId', whatsappController.generateWhatsAppRedirect);

module.exports = router; 
