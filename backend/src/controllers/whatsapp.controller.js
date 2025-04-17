const Order = require('../models/order.model');

// Helper function to format order details for WhatsApp
const formatOrderForWhatsApp = (order) => {
  const items = order.items.map((item, index) => {
    let itemText = `${index + 1}. ${item.name} x ${item.quantity} - ₹${item.price.toFixed(2)}`;

    if (item.combinationDetails && item.combinationDetails.isCombo) {
      itemText += `\n   ↳ Pendant: ${item.combinationDetails.pendantInfo.name} (₹${item.combinationDetails.pendantInfo.price.toFixed(2)})`;
      itemText += `\n   ↳ Chain: ${item.combinationDetails.chainInfo.name} (₹${item.combinationDetails.chainInfo.price.toFixed(2)})`;
    }

    return itemText;
  }).join('\n');

  const message = `
*New Order from ${order.customer.name}*
*Order ID:* ${order._id}
*Date:* ${new Date(order.createdAt).toLocaleString()}

*Items:*
${items}

*Subtotal:* ₹${order.subtotal.toFixed(2)}
*Tax (18% GST):* ₹${order.tax.toFixed(2)}
*Shipping:* ₹${order.shippingCost.toFixed(2)}
${order.discount > 0 ? `*Discount:* ₹${order.discount.toFixed(2)}\n` : ''}
*Total Amount:* ₹${order.totalAmount.toFixed(2)}

*Customer Details:*
*Name:* ${order.customer.name}
*Email:* ${order.customer.email}
*Phone:* ${order.customer.phone}
${order.customer.address.street ? `*Address:* ${order.customer.address.street}, ${order.customer.address.city}, ${order.customer.address.state}, ${order.customer.address.zipCode}, ${order.customer.address.country}` : ''}

${order.notes ? `*Notes:* ${order.notes}` : ''}

Thank you for your order! We will contact you shortly to confirm the details and process your payment.
  `;

  return message.trim();
};

// @desc    Send order details to WhatsApp
// @route   POST /api/whatsapp/send-order
// @access  Public
exports.sendOrderToWhatsApp = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const message = formatOrderForWhatsApp(order);
    const customerPhone = order.customer.phone;

    // In a real implementation, you would call the WhatsApp Business API here
    // For example, using Meta's WhatsApp Business API or a service like Twilio

    // Simulate a WhatsApp API call
    console.log('Sending WhatsApp message to:', customerPhone);
    console.log('Message:', message);

    // In production, replace with actual API call:
    /*
    const response = await axios.post('https://whatsapp-api-url.com/send', {
      to: customerPhone,
      message: message,
      apiKey: process.env.WHATSAPP_API_KEY
    });
    
    const conversationId = response.data.conversationId;
    */

    // For now, simulate a successful response
    const simulatedConversationId = `whatsapp-${Date.now()}-${orderId}`;

    // Update order with WhatsApp details
    order.whatsapp = {
      messageSent: true,
      conversationId: simulatedConversationId,
      lastMessageTimestamp: new Date()
    };

    await order.save();

    res.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      conversationId: simulatedConversationId,
      whatsappLink: `https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
    });
  } catch (error) {
    console.error('Send WhatsApp message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Webhook for WhatsApp message status updates
// @route   POST /api/whatsapp/webhook
// @access  Public/Webhook
exports.webhookHandler = async (req, res) => {
  try {
    const { event, data } = req.body;

    // Verify webhook signature (in production)
    // const signature = req.headers['x-whatsapp-signature'];
    // Validate signature using a secret key

    if (event === 'message') {
      const { conversationId, status, timestamp } = data;

      // Find order with this conversation ID
      const order = await Order.findOne({ 'whatsapp.conversationId': conversationId });

      if (order) {
        // Update order with message status
        order.whatsapp.lastMessageTimestamp = new Date(timestamp);
        await order.save();
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ message: 'Webhook processing error' });
  }
};

// @desc    Generate WhatsApp redirect URL
// @route   GET /api/whatsapp/redirect/:orderId
// @access  Public
exports.generateWhatsAppRedirect = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const message = formatOrderForWhatsApp(order);
    const whatsappPhone = process.env.WHATSAPP_PHONE_NUMBER || '919XXXXXXXXX'; // Default to business number

    const redirectUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

    res.json({
      redirectUrl,
      orderId: order._id,
      customerName: order.customer.name
    });
  } catch (error) {
    console.error('Generate WhatsApp redirect error:', error);

    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 
