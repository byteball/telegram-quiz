const db = require('./db');
const wallet = require('./wallet');
const {formatTextcoinLink} = require('./utils');
const conf = require('../conf');
const debug = require('debug')(`app:${__filename}`);

const processOneUser = async (bot) => {
	try {
		const isPaymentLimitReached = await db.checkPaymentLimitReached();
		debug('processOneUser', isPaymentLimitReached);

		if (!isPaymentLimitReached) {
			const user = await db.getUserPassedQuizNotPaid();

			if (user) {
				const textcoin = await wallet.sendTextcoins(user.id);

				await db.updateUser(user, {
					unit: textcoin.unit,
					textcoin: textcoin.textcoin,
					amount: textcoin.amount,
					payment_date: textcoin.payment_date,
				});

				const message = `Claim textcoin ${formatTextcoinLink(textcoin.textcoin)}`;

				bot.telegram.sendMessage(user.chat_id, message);

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
