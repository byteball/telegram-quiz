const bot = require('./bot');
const processFailedPayments = require('./process-failed-payments');
const db = require('./db');
const wallet = require('./wallet');

const debug = require('debug')(`app:${__filename}`);

db.connect()
	.then(() => {
		wallet.onReady()
			.then(() => {
				debug('Start bot');

				bot.startPolling();

				processFailedPayments.run(bot);
			})
			.catch((error) => {
				console.error(error);
			});
	})
	.catch((error) => {
		console.error(error);
	});
