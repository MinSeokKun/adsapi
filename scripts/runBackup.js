const { backupData } = require('../src/models/backup-script');

async function runBackup() {
  try {
    console.log('Starting database backup...');
    await backupData();
    console.log('Backup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

runBackup();