const Order = require('../models/order.model');
const Product = require('../models/product.model');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const {
      status,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Sort
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;

    // Execute query
    const orders = await Order.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'email displayName');

    // Get total count
    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private/Admin
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('createdBy', 'email displayName');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order by ID error:', error);

    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create an order (Admin)
// @route   POST /api/orders
// @access  Private/Admin
exports.createOrder = async (req, res) => {
  try {
    const {
      customer,
      items,
      status,
      subtotal,
      tax,
      shippingCost,
      discount,
      totalAmount,
      paymentMethod,
      paymentStatus,
      notes
    } = req.body;

    // Validate items stock
    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.name}`
        });
      }

      if (!product.inStock || product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `${product.name} is out of stock or has insufficient quantity`
        });
      }
    }

    // Create order
    const order = new Order({
      customer,
      items,
      status: status || 'pending',
      subtotal,
      tax,
      shippingCost: shippingCost || 0,
      discount: discount || 0,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentStatus || 'pending',
      notes,
      createdBy: req.user._id
    });

    // Calculate totals if not provided
    if (!subtotal || !totalAmount) {
      order.calculateTotals();
    }

    // Save order
    const savedOrder = await order.save();

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: { stockQuantity: -item.quantity }
        }
      );
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const statusUpdated = order.updateStatus(status);

    if (!statusUpdated) {
      return res.status(400).json({
        message: `Invalid status transition from ${order.status} to ${status}`
      });
    }

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order status error:', error);

    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create customer order via WhatsApp
// @route   POST /api/orders/whatsapp
// @access  Public
exports.createWhatsappOrder = async (req, res) => {
  try {
    const {
      customer,
      items,
      notes
    } = req.body;

    // Validate customer info
    if (!customer.name || !customer.phone || !customer.email) {
      return res.status(400).json({
        message: 'Customer name, phone, and email are required'
      });
    }

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    // Verify products exist and gather product details
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.productId || item.product}`
        });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl,
        combinationDetails: item.combinationDetails || {
          isCombo: false
        }
      });
    }

    // Create order
    const order = new Order({
      customer,
      items: orderItems,
      status: 'pending',
      notes,
      whatsapp: {
        messageSent: false
      }
    });

    // Calculate totals
    order.calculateTotals();

    // Save order
    const savedOrder = await order.save();

    // Return order details for WhatsApp redirection
    res.status(201).json({
      orderId: savedOrder._id,
      customer: savedOrder.customer,
      totalAmount: savedOrder.totalAmount,
      items: savedOrder.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        combinationDetails: item.combinationDetails
      })),
      whatsappRedirect: true
    });
  } catch (error) {
    console.error('Create WhatsApp order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update WhatsApp status for order
// @route   PUT /api/orders/:id/whatsapp-status
// @access  Private/Admin
exports.updateWhatsappStatus = async (req, res) => {
  try {
    const { conversationId, messageSent } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.whatsapp = {
      messageSent: messageSent || false,
      conversationId: conversationId || order.whatsapp.conversationId,
      lastMessageTimestamp: new Date()
    };

    const updatedOrder = await order.save();

    res.json({
      _id: updatedOrder._id,
      whatsapp: updatedOrder.whatsapp
    });
  } catch (error) {
    console.error('Update WhatsApp status error:', error);

    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Dashboard Order Stats
// @route   GET /api/orders/stats
// @access  Private/Admin
exports.getOrderStats = async (req, res) => {
  try {
    // Total orders
    const totalOrders = await Order.countDocuments();

    // Orders by status
    const pending = await Order.countDocuments({ status: 'pending' });
    const confirmed = await Order.countDocuments({ status: 'confirmed' });
    const processing = await Order.countDocuments({ status: 'processing' });
    const shipped = await Order.countDocuments({ status: 'shipped' });
    const delivered = await Order.countDocuments({ status: 'delivered' });
    const canceled = await Order.countDocuments({ status: 'canceled' });

    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'email displayName');

    // Total revenue
    const revenueResult = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'canceled' }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.json({
      totalOrders,
      statusCounts: {
        pending,
        confirmed,
        processing,
        shipped,
        delivered,
        canceled
      },
      recentOrders,
      totalRevenue
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 
