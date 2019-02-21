const db = require('./db');
const wallet = require('./wallet');
const {formatTextcoinMessage} = require('./utils');
const conf = require('ocore/conf.js');
const debug = require('debug')(`app:${__filename}`);

const processOneUser = async (bot) => {
	try {
		const isPaymentLimitReached = await db.checkPaymentLimitReached();
		debug('processOneUser', isPaymentLimitReached);

		if (!isPaymentLimitReached) {
			const user = await db.getUserPassedQuizNotPaid();

			if (user) {
				try {
					const objTextcoin = await wallet.processPayment(user.id);

					const message = formatTextcoinMessage(objTextcoin.textcoin);

					bot.telegram.sendMessage(user.chat_id, message).catch( (error) => console.error('processOneUser', error) );
				} catch (error) {
					console.error('Textcoin generation error', error);
				}

				return await processOneUser(bot);
			}
		}
	} catch (error) {
		console.error('Process user payment error', error);
	}
	setTimeout(() => processOneUser(bot), conf.botCheckForFailedPaymentsDelay);
};

const run = (bot) => {
	processOneUser(bot);
};

exports.run = run;
