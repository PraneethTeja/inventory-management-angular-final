# Jewelry Shop Backend

## Database Schema Synchronization

This project includes an automatic MongoDB schema synchronization system that runs on every server startup. This ensures that when you add or modify fields in your Mongoose models, the database collections are updated accordingly without affecting existing data.

### How It Works

1. When the server starts, after connecting to MongoDB, the bootstrap process runs
2. The bootstrap process calls the model synchronization utilities
3. For each model:
   - Schema fields and indexes are synchronized
   - New fields are added to existing documents with default values
   - Index changes are applied

### Model Registry

The system uses a central model registry (`src/utils/modelRegistry.js`) to keep track of all models in the application. This registry:

- Automatically discovers all models in the models directory
- Provides utility functions to work with models
- Makes schema synchronization more robust
- Enables bulk operations across all models

### Working with Models

#### Updating Models with the Bulk Update Script

The recommended way to add fields to models is using the new bulk update script:

```bash
# Add a field to a specific model
node src/scripts/updateModels.js -m Product -f isPopular -t boolean

# Add a field to ALL models
node src/scripts/updateModels.js -a -f createdBy -t string

# List all available models without making changes
node src/scripts/updateModels.js -a

# Get help and usage information
node src/scripts/updateModels.js -h
```

#### Adding a New Field to an Existing Model (Legacy Method)

You can also add a new field to a model by directly editing the model file, or by using the legacy helper script:

```bash
node src/scripts/addNewField.js Product metadata Map
```

This adds the specified field to the model. The first parameter is the model name, the second is the field name, and the third is the field type.

#### Creating a New Model

To create a new model with a proper schema structure:

```bash
node src/scripts/createNewModel.js ModelName
```

For example:
```bash
node src/scripts/createNewModel.js Review
```

This will create a new model file at `src/models/review.model.js` with a boilerplate schema.

### Technical Details

The synchronization system uses the following components:

1. `src/utils/modelRegistry.js` - Central registry of all models in the system
2. `src/utils/syncModels.js` - Coordinates the synchronization process using the registry
3. `src/utils/advancedModelSync.js` - Handles advanced schema updates:
   - `syncIndexes()` - Updates collection indexes to match the schema
   - `updateSchema()` - Adds missing fields with default values to existing documents
4. `src/utils/bootstrap.js` - Runs initialization tasks including model synchronization

The bootstrap process handles all of this automatically on server startup.

### Limitations

- Removing fields from schemas will not remove them from the database
- Changing field types may require a manual migration
- Collection level changes (like renaming collections) are not handled 
