/**
 * Model Configuration
 * 
 * This file stores configuration and metadata for MongoDB models
 * It can be used to:
 * 1. Override default collection names
 * 2. Define relationships between models
 * 3. Configure synchronization behavior
 * 4. Add custom validation or business rules
 */

const modelConfig = {
  // Default configuration applies to all models
  _default: {
    // When a field is added to a model, should it be automatically added to existing documents?
    applyDefaultsToExisting: true,
    // Should indexes be automatically synchronized?
    syncIndexes: true,
    // Should model schemas be strictly validated?
    strictValidation: true
  },

  // Model-specific configurations
  Product: {
    collectionName: 'products',
    description: 'Product catalog items',
    relationships: [
      { model: 'Order', via: 'items.product' }
    ]
  },

  Order: {
    collectionName: 'orders',
    description: 'Customer orders',
    relationships: [
      { model: 'Product', via: 'items.product' },
      { model: 'User', via: 'createdBy' }
    ]
  },

  User: {
    collectionName: 'users',
    description: 'System users',
    relationships: [
      { model: 'Order', via: 'createdBy' }
    ],
    // Custom synchronization settings
    syncIndexes: true,
    strictValidation: true
  }
};

/**
 * Get configuration for a specific model
 * @param {string} modelName - The name of the model
 * @returns {Object} Model configuration with defaults applied
 */
function getModelConfig(modelName) {
  // Get model-specific config or empty object if not defined
  const modelSpecificConfig = modelConfig[modelName] || {};

  // Merge with default config
  return {
    ...modelConfig._default,
    ...modelSpecificConfig,
    name: modelName
  };
}

/**
 * Get all model configurations
 * @returns {Object} All model configurations
 */
function getAllModelConfigs() {
  const configs = {};

  // Get all model names (excluding _default)
  const modelNames = Object.keys(modelConfig).filter(key => key !== '_default');

  // Build configuration object
  modelNames.forEach(modelName => {
    configs[modelName] = getModelConfig(modelName);
  });

  return configs;
}

module.exports = {
  getModelConfig,
  getAllModelConfigs
}; 
