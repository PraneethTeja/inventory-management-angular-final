/**
 * Model Registry - Central registry of all Mongoose models in the system
 * 
 * This file serves as a central location to:
 * 1. Register all models in the application
 * 2. Provide utility functions to work with models
 * 3. Make schema synchronization more robust
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const modelConfig = require('../config/modelConfig');

// Track loaded models to prevent recompilation errors
const loadedModels = {};

/**
 * Automatically discover all models in the models directory
 * @returns {Array} Array of model information objects
 */
function discoverModels() {
  const modelsDir = path.join(__dirname, '../models');
  const modelFiles = fs.readdirSync(modelsDir)
    .filter(file => file.endsWith('.model.js'));

  return modelFiles.map(file => {
    const name = file.replace('.model.js', '');
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    const config = modelConfig.getModelConfig(capitalizedName);

    return {
      name: capitalizedName, // Model name (e.g., "Product")
      path: path.join(modelsDir, file), // Full path to model file
      file: file, // Filename (e.g., "product.model.js")
      collection: config.collectionName || name + 's', // Collection name from config or default
      config // Additional configuration
    };
  });
}

/**
 * Get a specific model by name
 * @param {string} modelName - The name of the model to find
 * @returns {Object|null} Model information object or null if not found
 */
function getModelByName(modelName) {
  // Normalize model name to be case insensitive
  const normalizedName = modelName.charAt(0).toUpperCase() + modelName.slice(1).toLowerCase();

  const models = discoverModels();
  return models.find(model => model.name === normalizedName) || null;
}

/**
 * Get all models in the system
 * @returns {Array} Array of model information objects
 */
function getAllModels() {
  return discoverModels();
}

/**
 * Load a model instance by name
 * @param {string} modelName - The name of the model to load
 * @returns {mongoose.Model|null} Mongoose model instance or null if not found
 */
function loadModel(modelName) {
  const modelInfo = getModelByName(modelName);
  if (!modelInfo) return null;

  try {
    // First check if the model is already loaded in Mongoose
    if (mongoose.models[modelInfo.name]) {
      return mongoose.models[modelInfo.name];
    }

    // If model was previously loaded in this session, return it
    if (loadedModels[modelInfo.name]) {
      return loadedModels[modelInfo.name];
    }

    // Clear require cache to ensure we get the latest schema definition
    delete require.cache[require.resolve(modelInfo.path)];

    // Load the model
    const Model = require(modelInfo.path);

    // Store in our loaded models cache
    loadedModels[modelInfo.name] = Model;

    return Model;
  } catch (error) {
    // If it's an OverwriteModelError, try to get the already compiled model
    if (error.name === 'OverwriteModelError') {
      console.log(`Model ${modelInfo.name} already compiled, using existing model`);
      return mongoose.models[modelInfo.name];
    }

    console.error(`Error loading model ${modelName}:`, error);
    return null;
  }
}

/**
 * Clear all cached models
 * Useful when you need to refresh all models (e.g., during testing)
 */
function clearModelCache() {
  Object.keys(loadedModels).forEach(key => {
    delete loadedModels[key];
  });
}

/**
 * Get model dependencies - other models this model references
 * @param {string} modelName - Name of the model
 * @returns {Array} Array of model names that this model depends on
 */
function getModelDependencies(modelName) {
  const normalizedName = modelName.charAt(0).toUpperCase() + modelName.slice(1).toLowerCase();
  const config = modelConfig.getModelConfig(normalizedName);

  if (config.relationships) {
    return config.relationships.map(rel => rel.model);
  }

  return [];
}

module.exports = {
  getAllModels,
  getModelByName,
  loadModel,
  clearModelCache,
  getModelDependencies
}; 
