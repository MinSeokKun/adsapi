const fs = require('fs');
const path = require('path');
const { sequelize, Ad, AdMedia, AdSchedule, User, Salon, 
        Payment, PaymentRefund, Subscription, SubscriptionPlan } = require('../models');

const BACKUP_DIR = path.join(__dirname, 'backups', `backup_${Date.now()}`);

async function backupData() {
  try {
    // Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // List of models to backup
    const models = {
      ads: Ad,
      ad_medias: AdMedia, 
      ad_schedules: AdSchedule,
      users: User,
      salons: Salon,
      payments: Payment,
      payment_refunds: PaymentRefund,
      subscriptions: Subscription,
      subscription_plans: SubscriptionPlan
    };

    // Backup each model's data
    for (const [name, model] of Object.entries(models)) {
      console.log(`Backing up ${name}...`);
      
      const records = await model.findAll({
        raw: true
      });

      // Save to JSON file
      const filePath = path.join(BACKUP_DIR, `${name}.json`);
      fs.writeFileSync(
        filePath,
        JSON.stringify(records, null, 2)
      );

      console.log(`Backed up ${records.length} records from ${name}`);
    }

    console.log(`Backup completed successfully to ${BACKUP_DIR}`);

  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

// Restore function for after migration
async function restoreData() {
  try {
    // Get the latest backup directory
    const backupDirs = fs.readdirSync(path.join(__dirname, 'backups'));
    const latestBackup = backupDirs.sort().pop();
    const restorePath = path.join(__dirname, 'backups', latestBackup);

    const models = {
      ads: Ad,
      ad_medias: AdMedia,
      ad_schedules: AdSchedule,
      users: User,
      salons: Salon,
      payments: Payment,
      payment_refunds: PaymentRefund,
      subscriptions: Subscription,
      subscription_plans: SubscriptionPlan
    };

    // Restore in specific order due to foreign key constraints
    const restoreOrder = [
      'users',
      'subscription_plans',
      'salons',
      'ads',
      'ad_medias',
      'ad_schedules',
      'subscriptions',
      'payments',
      'payment_refunds'
    ];

    for (const modelName of restoreOrder) {
      console.log(`Restoring ${modelName}...`);
      
      const filePath = path.join(restorePath, `${modelName}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      await models[modelName].bulkCreate(data, {
        individualHooks: true // For User password hashing
      });

      console.log(`Restored ${data.length} records to ${modelName}`);
    }

    console.log('Restore completed successfully');

  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
}

module.exports = {
  backupData,
  restoreData
};