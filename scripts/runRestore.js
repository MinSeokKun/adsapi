const { restoreData } = require('../src/models/backup-script');

async function runRestore() {
  try {
    console.log('Starting database restore...');
    await restoreData();
    console.log('Restore completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Restore failed:', error);
    process.exit(1);
  }
}

runRestore();