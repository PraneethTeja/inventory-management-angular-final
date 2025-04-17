const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required']
  },
  photoURL: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'customer'],
    default: 'customer'
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    }
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

// Hash password before saving
userSchema.pre('save', async function (next) {
  const user = this;

  // Only hash the password if it's modified or new
  if (!user.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to handle login attempts
userSchema.methods.handleLoginAttempt = function (isSuccessful) {
  if (isSuccessful) {
    this.loginAttempts = 0;
    this.lockedUntil = null;
  } else {
    this.loginAttempts += 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (this.loginAttempts >= 5) {
      const thirtyMinutesFromNow = new Date();
      thirtyMinutesFromNow.setMinutes(thirtyMinutesFromNow.getMinutes() + 30);
      this.lockedUntil = thirtyMinutesFromNow;
    }
  }

  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 
