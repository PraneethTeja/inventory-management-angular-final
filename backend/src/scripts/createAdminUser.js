/**
 * Create Admin User Script
 * 
 * This script creates an admin user in the database if one doesn't already exist
 * It uses credentials from adminConfig.js or environment variables
 * 
 * Usage:
 *   node src/scripts/createAdminUser.js                  - Create default admin from config
 *   node src/scripts/createAdminUser.js --interactive    - Interactive mode (prompts for credentials)
 *   node src/scripts/createAdminUser.js --force          - Force create (overwrite if exists)
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const readline = require('readline');

// Load environment variables with explicit path
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  require('dotenv').config({ path: envPath });
} else {
  // Try fallback to backend directory
  const backendEnvPath = path.resolve(process.cwd(), '..', '.env');
  if (fs.existsSync(backendEnvPath)) {
    console.log(`Loading environment from: ${backendEnvPath}`);
    require('dotenv').config({ path: backendEnvPath });
  } else {
    console.warn('⚠️ No .env file found. Using default values.');
    require('dotenv').config(); // Try default loading
  }
}

// Load admin config
let adminConfig;
try {
  adminConfig = require('../config/adminConfig');
} catch (error) {
  console.warn('⚠️ Admin config not found, using environment variables only');
  adminConfig = {
    admin: {
      email: process.env.ADMIN_EMAIL || 'praneeth@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'adminpass',
      displayName: process.env.ADMIN_NAME || 'Praneeth_Pedapati'
    },
    additionalAdmins: []
  };
}

// Check for command line arguments
const args = process.argv.slice(2);
const isInteractive = args.includes('--interactive') || args.includes('-i');
const forceCreate = args.includes('--force') || args.includes('-f');
const showConnectionString = args.includes('--show-connection') || args.includes('-s');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://praneethpedapati98:Tj4nguIhlnUnd4ll@cluster0.sqhukiy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// If --show-connection flag is provided, display the connection string (with password masked)
if (showConnectionString) {
  const displayUri = MONGODB_URI.replace(/:([^@/]+)@/, ':****@');
  console.log(`Using MongoDB connection: ${displayUri}`);
}

// Create readline interface for interactive mode
const rl = isInteractive ? readline.createInterface({
  input: process.stdin,
  output: process.stdout
}) : null;

// Interactive prompt function
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Load User model directly to avoid circular dependency issues
async function loadUserModel() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    console.log('Connected to MongoDB');

    // Get User model from mongoose
    // If already registered, use it, otherwise load it
    return mongoose.models.User || require('../models/user.model');
  } catch (error) {
    console.error('\nError connecting to MongoDB:');
    console.error(error.message);

    if (error.name === 'MongooseServerSelectionError') {
      console.error('\nPossible solutions:');
      console.error('1. Make sure MongoDB is running');
      console.error('2. Check your connection string in .env file');
      console.error('3. Run with --show-connection flag to see the connection string');
      console.error(`4. Create a .env file with: MONGODB_URI=mongodb://your-mongodb-connection-string`);
    }

    process.exit(1);
  }
}

// Create admin user
async function createAdmin(userData) {
  try {
    const User = await loadUserModel();

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });

    if (existingUser) {
      if (forceCreate) {
        console.log(`Admin user ${userData.email} already exists. Updating...`);

        // Update existing user
        existingUser.displayName = userData.displayName;
        existingUser.role = 'admin';

        // Only update password if it was provided
        if (userData.password) {
          // Password will be hashed by the pre-save hook
          existingUser.password = userData.password;
        }

        await existingUser.save();
        console.log(`✅ Admin user ${userData.email} updated successfully`);
      } else {
        console.log(`⚠️ Admin user ${userData.email} already exists. Use --force to update.`);
      }
      return;
    }

    // Create new admin user
    const newAdmin = new User({
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName,
      role: 'admin'
    });

    await newAdmin.save();
    console.log(`✅ Admin user ${userData.email} created successfully`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');

    // Close readline interface if in interactive mode
    if (rl) {
      rl.close();
    }
  }
}

// Main function
async function main() {
  console.log('=== CREATE ADMIN USER ===');

  let adminData;

  if (isInteractive) {
    // Get credentials interactively
    console.log('Please enter admin user credentials:');
    const email = await prompt('Email: ');
    const password = await prompt('Password: ');
    const displayName = await prompt('Display Name: ');

    adminData = { email, password, displayName };
  } else {
    // Use credentials from config
    adminData = adminConfig.admin;
    console.log(`Using admin credentials for: ${adminData.email}`);
  }

  await createAdmin(adminData);

  // Handle additional admins if --all flag is provided
  if (args.includes('--all') && adminConfig.additionalAdmins.length > 0) {
    console.log('\nCreating additional admin users...');

    for (const admin of adminConfig.additionalAdmins) {
      console.log(`\nProcessing: ${admin.email}`);
      await createAdmin(admin);
    }
  }
}

// Run the script
main(); 
