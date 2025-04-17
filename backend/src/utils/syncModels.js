const mongoose = require('mongoose');
const ModelSynchronizer = require('./advancedModelSync');
const modelRegistry = require('./modelRegistry');

/**
 * Sort models by dependencies to ensure they're processed in the correct order
 * @param {Array} models - Array of model information objects
 * @returns {Array} Sorted array of model information objects
 */
function sortModelsByDependency(models) {
  // Map to track processed models (to avoid circular dependencies)
  const processed = new Map();
  const sortedModels = [];

  // Add a model to the sorted list, recursively adding its dependencies first
  function addModelToSorted(modelInfo) {
    // Skip if already processed or being processed
    if (processed.has(modelInfo.name)) {
      return;
    }

    // Mark as being processed to detect circular dependencies
    processed.set(modelInfo.name, 'processing');

    // Add dependencies first
    const dependencies = modelRegistry.getModelDependencies(modelInfo.name);
    dependencies.forEach(depName => {
      const depModel = models.find(m => m.name === depName);
      if (depModel) {
        if (processed.get(depModel.name) === 'processing') {
          console.warn(`Circular dependency detected between ${modelInfo.name} and ${depModel.name}`);
        } else if (!processed.has(depModel.name)) {
          addModelToSorted(depModel);
        }
      }
    });

    // Add this model
    sortedModels.push(modelInfo);
    processed.set(modelInfo.name, 'processed');
  }

  // Process all models
  models.forEach(model => {
    if (!processed.has(model.name)) {
      addModelToSorted(model);
    }
  });

  return sortedModels;
}

/**
 * Synchronizes the Mongoose models with MongoDB collections
 * This ensures that schema changes (added or modified fields) are properly updated
 * without affecting existing data
 */
const syncModels = async () => {
  try {
    console.log('Starting model synchronization...');

    // Get all models from the registry
    let models = modelRegistry.getAllModels();

    // Sort models by dependencies
    models = sortModelsByDependency(models);

    console.log(`Found ${models.length} models to synchronize`);

    // Track information about synced models
    const syncResults = {
      totalModels: models.length,
      syncedModels: [],
      errors: []
    };

    // Process each model from the registry
    for (const modelInfo of models) {
      try {
        const modelName = modelInfo.name;
        console.log(`Processing model: ${modelName}`);

        // Load the model using the registry
        const Model = modelRegistry.loadModel(modelName);

        if (!Model) {
          throw new Error(`Failed to load model: ${modelName}`);
        }

        // Apply synchronization based on model config
        if (modelInfo.config.syncIndexes) {
          console.log(`Syncing indexes for ${modelName}`);

          // Use the advanced model synchronizer
          const syncResult = await ModelSynchronizer.syncModel(Model);

          // Track results
          syncResults.syncedModels.push({
            name: modelName,
            fileName: modelInfo.file,
            ...syncResult
          });

          console.log(`✓ Synchronized model: ${modelName}`);
        } else {
          console.log(`Skipping index sync for ${modelName} (disabled in config)`);
          syncResults.syncedModels.push({
            name: modelName,
            fileName: modelInfo.file,
            skipped: true,
            reason: 'Index synchronization disabled in config'
          });
        }
      } catch (err) {
        console.error(`Error synchronizing model ${modelInfo.name}:`, err);
        syncResults.errors.push({
          model: modelInfo.name,
          error: err.message
        });
      }
    }

    // Log final results
    console.log(`Model synchronization complete: ${syncResults.syncedModels.length} models processed, ${syncResults.errors.length} errors`);

    // Only in development mode - log detailed sync info
    if (process.env.NODE_ENV !== 'production') {
      syncResults.syncedModels.forEach(model => {
        if (model.operations) {
          const schemaUpdates = model.operations.find(op => op.operation === 'updateSchema');
          if (schemaUpdates && schemaUpdates.fieldsUpdated > 0) {
            console.log(`  - ${model.name}: ${schemaUpdates.fieldsUpdated} fields updated: ${schemaUpdates.fields.join(', ')}`);
          }
        }
      });

      if (syncResults.errors.length > 0) {
        console.log('Synchronization errors:');
        syncResults.errors.forEach(error => {
          console.log(`  - ${error.model}: ${error.error}`);
        });
      }
    }

    return syncResults;
  } catch (err) {
    console.error('Failed to synchronize models:', err);
    throw err;
  }
};

module.exports = syncModels; 
