const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['chain', 'pendant', 'combination', 'accessory'],
    required: true
  },
  imageUrl: String,
  combinationDetails: {
    isCombo: {
      type: Boolean,
      default: false
    },
    pendantInfo: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
      price: Number
    },
    chainInfo: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
      price: Number
    }
  }
});

const orderSchema = new mongoose.Schema({
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'India'
      }
    }
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled'],
    default: 'pending'
  },
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'bank_transfer', 'upi', 'wallet'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  whatsapp: {
    messageSent: {
      type: Boolean,
      default: false
    },
    conversationId: {
      type: String,
      default: null
    },
    lastMessageTimestamp: {
      type: Date,
      default: null
    }
  },
  trackingInfo: {
    carrier: String,
    trackingNumber: String,
    expectedDelivery: Date,
    url: String
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to calculate order totals
orderSchema.methods.calculateTotals = function () {
  // Calculate subtotal
  this.subtotal = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  // Apply tax (e.g., 18% GST for India)
  this.tax = this.subtotal * 0.18;

  // Calculate total amount
  this.totalAmount = this.subtotal + this.tax + this.shippingCost - this.discount;

  return this;
};

// Method to update order status
orderSchema.methods.updateStatus = function (newStatus) {
  const validTransitions = {
    pending: ['confirmed', 'canceled'],
    confirmed: ['processing', 'canceled'],
    processing: ['shipped', 'canceled'],
    shipped: ['delivered', 'canceled'],
    delivered: ['canceled'],
    canceled: []
  };

  if (validTransitions[this.status].includes(newStatus)) {
    this.status = newStatus;
    return true;
  }

  return false;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 
