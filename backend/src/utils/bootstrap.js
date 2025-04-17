const syncModels = require('./syncModels');
const modelRegistry = require('./modelRegistry');

/**
 * Bootstrap function to run all initialization tasks
 * This is called when the server starts
 */
const bootstrap = async () => {
  try {
    console.log('🚀 Running bootstrap sequence...');

    // 1. Clear model cache before synchronization
    console.log('🧹 Clearing model cache...');
    modelRegistry.clearModelCache();

    // 2. Sync MongoDB models with their collections
    console.log('📊 Syncing database models...');
    const syncResults = await syncModels();

    // Log synchronization results
    const successCount = syncResults.syncedModels.length;
    const errorCount = syncResults.errors.length;

    if (errorCount > 0) {
      console.log(`⚠️ Model synchronization completed with ${errorCount} errors`);

      // Log error details in development
      if (process.env.NODE_ENV !== 'production') {
        syncResults.errors.forEach(error => {
          console.log(`   - ${error.model}: ${error.error}`);
        });
      }
    } else {
      console.log(`✅ All models (${successCount}) synchronized successfully`);
    }

    // Add more initialization tasks as needed
    // e.g., seeding initial data, checking configurations, etc.

    console.log('✅ Bootstrap sequence completed successfully');
    return {
      success: true,
      syncResults
    };
  } catch (error) {
    console.error('❌ Bootstrap sequence failed:', error);
    // Don't throw here - we want the server to start even if bootstrap fails
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = bootstrap; 
