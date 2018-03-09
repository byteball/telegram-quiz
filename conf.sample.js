//exports.port = 6611;
//exports.myUrl = 'wss://mydomain.com/bb';
exports.bServeAsHub = false;
exports.bLight = true;

// Database
exports.storage = 'sqlite';

//email
exports.useEmail = true;
exports.admin_email = '';
exports.from_email = '';
exports.useSmtp = false;
exports.smtpUser = '';
exports.smtpPassword = '';
exports.smtpHost = '';

// exports.hub = 'byteball.org/bb';
exports.hub = 'byteball.org/bb-test';
exports.deviceName = 'Headless';
exports.permanent_pairing_secret = '';
exports.control_addresses = ['DEVICE ALLOWED TO CHAT'];
// exports.payout_address = 'WHERE THE MONEY CAN BE SENT TO';
exports.KEYS_FILENAME = 'keys.json';

// where logs are written to (absolute path).  Default is log.txt in app data directory
//exports.LOG_FILENAME = '/dev/null';

// consolidate unspent outputs when there are too many of them.  Value of 0 means do not try to consolidate
exports.MAX_UNSPENT_OUTPUTS = 0;
exports.CONSOLIDATION_INTERVAL = 3600*1000;

// Quiz bot settings
// Telegram redis session connection options
exports.botRedisSessionHost = '127.0.0.1';
exports.botRedisSessionPort = '6379';

// Telegram bot token. You can obtain it from @BotFather
exports.botTelegramToken = '';

// Number of right answers user should answer before receiving reward
exports.botRequiredNumberOfRightAnswers = 1;
// Amount of bytes sent to user as a reward
exports.botAmountToSendPerUser = 1;
// Amount of bytes set as daily limit
exports.botDailyLimit = 2;
// Set in milliseconds
exports.botCheckForFailedPaymentsDelay = 5000;

console.log('finished quiz conf');
