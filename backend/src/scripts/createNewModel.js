/**
 * This script provides a template for creating a new model
 * After creating a new model, the server bootstrap process will automatically 
 * sync it with MongoDB
 * 
 * Run with: node src/scripts/createNewModel.js <ModelName>
 * Example: node src/scripts/createNewModel.js Review
 */

const path = require('path');
const fs = require('fs');

// Get model name from command line arguments
const modelName = process.argv[2];

if (!modelName) {
  console.error('Please provide a model name as an argument');
  console.error('Example: node src/scripts/createNewModel.js Review');
  process.exit(1);
}

// Convert model name to proper case and ensure singular form
const formattedModelName = modelName.charAt(0).toUpperCase() + modelName.slice(1).toLowerCase();
const fileName = formattedModelName.toLowerCase() + '.model.js';
const filePath = path.join(__dirname, '../models', fileName);

// Check if model already exists
if (fs.existsSync(filePath)) {
  console.error(`Model ${formattedModelName} already exists at ${filePath}`);
  process.exit(1);
}

// Template for a new model
const modelTemplate = `const mongoose = require('mongoose');

const ${formattedModelName.toLowerCase()}Schema = new mongoose.Schema({
  // Add your schema fields here
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  description: {
    type: String,
    required: false
  },
  // Example of a reference to another model
  // user: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User',
  //   required: true
  // },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes if needed
// ${formattedModelName.toLowerCase()}Schema.index({ name: 'text' });

// Add virtual properties if needed
// ${formattedModelName.toLowerCase()}Schema.virtual('virtualProperty').get(function() {
//   return this.someField;
// });

// Add instance methods if needed
// ${formattedModelName.toLowerCase()}Schema.methods.methodName = function() {
//   // Your method implementation
// };

// Create and export the model
const ${formattedModelName} = mongoose.model('${formattedModelName}', ${formattedModelName.toLowerCase()}Schema);

module.exports = ${formattedModelName};
`;

// Write the model file
try {
  fs.writeFileSync(filePath, modelTemplate, 'utf8');
  console.log(`✅ Successfully created new model: ${formattedModelName}`);
  console.log(`Model file created at: ${filePath}`);
  console.log('Next time you start the server, this model will be synchronized with MongoDB');
} catch (error) {
  console.error('Error creating model file:', error);
  process.exit(1);
} 
