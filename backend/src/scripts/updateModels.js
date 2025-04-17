/**
 * Model Update Script
 * 
 * This script can update a specific model or all models in the system
 * Options:
 * 1. Add a new field to a specific model
 * 2. Add a new field to all models
 * 3. Update all models in the system
 * 
 * Usage: 
 * - Add field to specific model: node src/scripts/updateModels.js -m Model -f fieldName -t fieldType
 * - Add field to all models: node src/scripts/updateModels.js -a -f fieldName -t fieldType
 * - Update all models: node src/scripts/updateModels.js -a
 */

const fs = require('fs');
const path = require('path');
const modelRegistry = require('../utils/modelRegistry');

// Parse command line arguments
const args = parseArgs(process.argv.slice(2));

// Main execution function
async function main() {
  try {
    // Display header
    console.log('=== MODEL UPDATE UTILITY ===');

    // Get models based on arguments
    const models = args.all
      ? modelRegistry.getAllModels()
      : (args.model ? [modelRegistry.getModelByName(args.model)] : []);

    // Validate models
    if (models.length === 0 || models[0] === null) {
      showUsage();
      return;
    }

    // If adding a field, make sure we have field name and type
    if (args.field && (!args.field || !args.type)) {
      console.error('Error: When adding a field, both field name (-f) and type (-t) are required');
      showUsage();
      return;
    }

    // Process each model
    let successCount = 0;
    for (const model of models) {
      if (model) {
        if (args.field) {
          // Add field to model
          if (await addFieldToModel(model, args.field, args.type)) {
            successCount++;
          }
        } else {
          // Just log the model information
          console.log(`Model: ${model.name} (${model.file})`);
          console.log(`Collection: ${model.collection}`);
          console.log(`Path: ${model.path}`);
          console.log('---');
          successCount++;
        }
      }
    }

    // Summary
    if (args.field) {
      console.log(`\nOperation complete: Added field '${args.field}' to ${successCount} model(s)`);
    } else {
      console.log(`\nOperation complete: Processed ${successCount} model(s)`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Add a field to a model
 * @param {Object} model - Model information object
 * @param {string} fieldName - Name of the field to add
 * @param {string} fieldType - Type of the field
 * @returns {boolean} Success flag
 */
async function addFieldToModel(model, fieldName, fieldType) {
  try {
    console.log(`\nProcessing model: ${model.name}`);

    // Read the model file
    let content = fs.readFileSync(model.path, 'utf8');

    // Check if field already exists
    if (content.includes(`${fieldName}: {`)) {
      console.log(`- Field '${fieldName}' already exists, skipping`);
      return true;
    }

    // Find where to insert the new field (before the schema closing)
    const schemaPosition = content.indexOf('}, {');

    if (schemaPosition === -1) {
      console.error(`- Error: Could not find schema definition in ${model.file}`);
      return false;
    }

    // Generate the new field definition
    const newField = generateFieldDefinition(fieldName, fieldType);

    // Insert the new field
    const updatedContent =
      content.slice(0, schemaPosition) +
      newField +
      content.slice(schemaPosition);

    // Write back the updated file
    fs.writeFileSync(model.path, updatedContent, 'utf8');

    console.log(`- ✅ Added field '${fieldName}' of type '${fieldType}' to ${model.name}`);
    return true;
  } catch (error) {
    console.error(`- Error updating ${model.name}:`, error.message);
    return false;
  }
}

/**
 * Generate field definition based on field type
 * @param {string} name - Field name
 * @param {string} type - Field type
 * @returns {string} Field definition code
 */
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

/**
 * Parse command line arguments
 * @param {Array} args - Command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs(args) {
  const result = {
    all: false,
    model: null,
    field: null,
    type: null
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-a':
      case '--all':
        result.all = true;
        break;
      case '-m':
      case '--model':
        result.model = args[++i];
        break;
      case '-f':
      case '--field':
        result.field = args[++i];
        break;
      case '-t':
      case '--type':
        result.type = args[++i];
        break;
      case '-h':
      case '--help':
        showUsage();
        process.exit(0);
        break;
    }
  }

  return result;
}

/**
 * Show usage information
 */
function showUsage() {
  console.log('\nUsage:');
  console.log('  node src/scripts/updateModels.js [options]');
  console.log('\nOptions:');
  console.log('  -a, --all              Process all models');
  console.log('  -m, --model <name>     Specify a model name');
  console.log('  -f, --field <name>     Field name to add');
  console.log('  -t, --type <type>      Field type (string, number, boolean, date, array, map)');
  console.log('  -h, --help             Show this help message');
  console.log('\nExamples:');
  console.log('  node src/scripts/updateModels.js -m Product -f isPopular -t boolean');
  console.log('  node src/scripts/updateModels.js -a -f createdBy -t string');
  console.log('  node src/scripts/updateModels.js -a');

  // List available models
  const models = modelRegistry.getAllModels();
  console.log('\nAvailable models:');
  models.forEach(model => {
    console.log(`  - ${model.name}`);
  });
  console.log('');
}

// Run the script
main(); 
