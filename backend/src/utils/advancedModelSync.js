const mongoose = require('mongoose');

/**
 * Advanced model synchronization utility
 * 
 * This utility provides methods to safely update MongoDB collections
 * when Mongoose schemas change without losing data
 */
class ModelSynchronizer {
  /**
   * Check and update indexes for a specific model
   * @param {mongoose.Model} model - The Mongoose model
   */
  static async syncIndexes(model) {
    try {
      console.log(`Syncing indexes for model: ${model.modelName}`);
      const result = await model.syncIndexes();
      return {
        model: model.modelName,
        success: true,
        operation: 'syncIndexes',
        result
      };
    } catch (error) {
      console.error(`Error syncing indexes for ${model.modelName}:`, error);
      return {
        model: model.modelName,
        success: false,
        operation: 'syncIndexes',
        error: error.message
      };
    }
  }

  /**
   * Update the collection schema in MongoDB
   * @param {mongoose.Model} model - The Mongoose model
   */
  static async updateSchema(model) {
    try {
      // Get the collection
      const collection = model.collection;
      const modelName = model.modelName;

      // Get schema paths that might need updates
      const schemaPaths = model.schema.paths;

      // Get a sample document from the collection
      const sampleDocument = await model.findOne({}).lean();

      // If no documents yet, nothing to update
      if (!sampleDocument) {
        return {
          model: modelName,
          success: true,
          operation: 'updateSchema',
          result: 'No documents to update'
        };
      }

      // Check for fields that exist in schema but might be missing in some documents
      const fieldUpdates = [];

      // Get the schema's default values for fields that might be missing
      for (const [pathName, pathSchema] of Object.entries(schemaPaths)) {
        // Skip internal fields and virtuals
        if (pathName.startsWith('_') || pathSchema.options.type === undefined) {
          continue;
        }

        // Get default value from schema if it exists
        const hasDefault = pathSchema.defaultValue !== undefined;
        const defaultValue = pathSchema.defaultValue;

        // Skip if this field doesn't have a default or is already in sample document
        if (!hasDefault || sampleDocument[pathName] !== undefined) {
          continue;
        }

        // Found a field that should be initialized with default value
        fieldUpdates.push({
          field: pathName,
          default: defaultValue
        });
      }

      // Apply updates if any fields need defaults
      if (fieldUpdates.length > 0) {
        console.log(`Updating ${fieldUpdates.length} fields with defaults in ${modelName}`);

        for (const update of fieldUpdates) {
          // Find documents missing this field and update them
          const updateQuery = {};
          updateQuery[update.field] = { $exists: false };

          const updateOperation = {};
          updateOperation[update.field] = update.default;

          const updateResult = await collection.updateMany(
            updateQuery,
            { $set: updateOperation }
          );

          console.log(`Updated field ${update.field} in ${updateResult.modifiedCount} documents`);
        }
      }

      return {
        model: modelName,
        success: true,
        operation: 'updateSchema',
        fieldsUpdated: fieldUpdates.length,
        fields: fieldUpdates.map(u => u.field)
      };
    } catch (error) {
      console.error(`Error updating schema for ${model.modelName}:`, error);
      return {
        model: model.modelName,
        success: false,
        operation: 'updateSchema',
        error: error.message
      };
    }
  }

  /**
   * Perform full synchronization for a model
   * @param {mongoose.Model} model - The Mongoose model
   */
  static async syncModel(model) {
    const results = [];

    // Sync indexes
    results.push(await this.syncIndexes(model));

    // Update schema (apply defaults to missing fields)
    results.push(await this.updateSchema(model));

    return {
      model: model.modelName,
      operations: results,
      success: results.every(r => r.success)
    };
  }
}

module.exports = ModelSynchronizer; 
