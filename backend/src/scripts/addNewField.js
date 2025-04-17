/**
 * This script adds a new field to a specified model
 * After running this script, start the server and the bootstrap process
 * will automatically sync the field to the MongoDB collection
 * 
 * Run with: node src/scripts/addNewField.js <ModelName> <FieldName> <FieldType>
 * Example: node src/scripts/addNewField.js Product metadata Map
 */

const path = require('path');
const fs = require('fs');

// Get arguments from command line
const modelName = process.argv[2];
const fieldName = process.argv[3];
const fieldType = process.argv[4] || 'String';

// Validate arguments
if (!modelName || !fieldName) {
  console.error('Please provide a model name and field name as arguments');
  console.error('Example: node src/scripts/addNewField.js Product metadata Map');
  process.exit(1);
}

// Format model name (ensure first letter is capitalized)
const formattedModelName = modelName.charAt(0).toUpperCase() + modelName.slice(1).toLowerCase();
const fileName = formattedModelName.toLowerCase() + '.model.js';
const modelFilePath = path.join(__dirname, '../models', fileName);

// Check if model file exists
if (!fs.existsSync(modelFilePath)) {
  console.error(`Model file not found: ${modelFilePath}`);
  console.error('Available models:');

  const modelsDir = path.join(__dirname, '../models');
  const modelFiles = fs.readdirSync(modelsDir)
    .filter(file => file.endsWith('.model.js'))
    .map(file => file.replace('.model.js', ''));

  modelFiles.forEach(model => console.error(`- ${model}`));
  process.exit(1);
}

// Generate field definition based on field type
function generateFieldDefinition(name, type) {
  switch (type.toLowerCase()) {
    case 'string':
      return `
  ${name}: {
    type: String,
    default: ''
  },`;
    case 'number':
      return `
  ${name}: {
    type: Number,
    default: 0
  },`;
    case 'boolean':
      return `
  ${name}: {
    type: Boolean,
    default: false
  },`;
    case 'date':
      return `
  ${name}: {
    type: Date,
    default: null
  },`;
    case 'array':
      return `
  ${name}: {
    type: [String],
    default: []
  },`;
    case 'map':
      return `
  ${name}: {
    type: Map,
    of: String,
    default: new Map()
  },`;
    default:
      return `
  ${name}: {
    type: ${type},
    default: null
  },`;
  }
}

// Read and update the model file
try {
  console.log(`Reading model file: ${fileName}...`);
  let content = fs.readFileSync(modelFilePath, 'utf8');

  // Check if field already exists
  if (content.includes(`${fieldName}: {`)) {
    console.log(`Field '${fieldName}' already exists in model, skipping...`);
    process.exit(0);
  }

  // Find where to insert the new field (before the schema closing)
  const schemaPosition = content.indexOf('}, {');

  if (schemaPosition === -1) {
    console.error('Could not find schema definition in file');
    process.exit(1);
  }

  // Generate the new field definition
  const newField = generateFieldDefinition(fieldName, fieldType);

  // Insert the new field
  const updatedContent =
    content.slice(0, schemaPosition) +
    newField +
    content.slice(schemaPosition);

  // Write back the updated file
  fs.writeFileSync(modelFilePath, updatedContent, 'utf8');

  console.log(`✅ Successfully added new "${fieldName}" field to ${formattedModelName} model`);
  console.log('Next time you start the server, this field will be synchronized with MongoDB');
} catch (error) {
  console.error('Error updating model file:', error);
  process.exit(1);
} 
