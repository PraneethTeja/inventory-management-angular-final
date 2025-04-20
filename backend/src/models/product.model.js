const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['chain', 'pendant'],
    index: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  inStock: {
    type: Boolean,
    default: true
  },
  productCode: {
    type: String,
    required: [true, 'Product code is required'],
    unique: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: false,
    default: ''
  },
  imageUrls: {
    type: [String],
    default: []
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  details: {
    material: String,
    weight: String,
    dimensions: String,
    features: [String]
  },
  customProperties: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  featured: {
    type: Boolean,
    default: false
  },
  discount: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    validUntil: {
      type: Date,
      default: null
    }
  },
  tags: {
    type: [String],
    default: []
  },
  relatedProducts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function () {
  if (this.discount.percentage > 0) {
    const now = new Date();
    if (!this.discount.validUntil || now < this.discount.validUntil) {
      return this.price * (1 - this.discount.percentage / 100);
    }
  }
  return this.price;
});

// For combination products, store component IDs
productSchema.virtual('components').get(function () {
  if (this.category === 'combination') {
    return {
      chain: this.customProperties.get('chainId'),
      pendant: this.customProperties.get('pendantId')
    };
  }
  return null;
});

// Index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 
