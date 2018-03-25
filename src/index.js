const processFailedPayments = require('./process-failed-payments');
const db = require('./db');
const wallet = require('./wallet');

const debug = require('debug')(`app:${__filename}`);

process.on('unhandledRejection', up => { throw up; });

db.connect()
	.then(() => {
		wallet.onReady()
			.then(() => {
				debug('Start bot');

				const bot = require('./bot');
				bot.startPolling();

				processFailedPayments.run(bot);
			});
	});
