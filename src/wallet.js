const eventBus = require('byteballcore/event_bus.js');
const constants = require('byteballcore/constants.js');
const mutex = require('byteballcore/mutex.js');
const conf = require('byteballcore/conf.js');
const db = require('./db');
const conversion = require('./conversion');

const sendTextcoin = (id) => new Promise((resolve, reject) => {
	const address = `textcoin:${id}`;
	const amount = conversion.getPriceInBytes(conf.botRewardInUSD) + constants.TEXTCOIN_CLAIM_FEE; // bytes
	const opts = {
		asset: null,
		amount,
		to_address: address,
		email_subject: 'Payment in textcoin',
	};

	const headlessWallet = require('headless-byteball');
	headlessWallet.issueChangeAddressAndSendMultiPayment(opts, (err, unit, assocMnemonics) => {
		if (err) {
			console.error('Textcoin payment error', err);
			reject(err);
		} else {
			const textcoin = assocMnemonics[address];
			resolve({
				unit,
				amount,
				textcoin,
				payment_date: Math.floor(Date.now() / 1000),
			});
		}
	});
});

exports.sendTextcoin = sendTextcoin;

const processPayment = async (userId) => new Promise((resolve, reject) => {
	mutex.lock([userId], async (unlock) => {
		let user;
		let objTextcoin;
		try {
			user = await db.findUser(userId);
		} catch (error) {
			console.error(error);
			reject(error);
			return unlock();
		}

		if (user && !user.quiz_pass_date) {
			reject(new Error('User hasn\'t passed the quiz'));
			return unlock();
		}

		if (user && user.payment_date) {
			reject(new Error('User has been already paid'));
			return unlock();
		}

		try {
			objTextcoin = await sendTextcoin(user.id);
		} catch (error) {
			console.error('Textcoin generation error', error);
			reject(error);
			return unlock();
		}

		await db.updateUser(user, {
			unit: objTextcoin.unit,
			textcoin: objTextcoin.textcoin,
			amount: objTextcoin.amount,
			payment_date: objTextcoin.payment_date,
		});

		resolve(objTextcoin);
		return unlock();
	});
});

exports.processPayment = processPayment;

exports.onReady = () => new Promise((resolve) => {
	eventBus.on('headless_and_rates_ready', () => {
		const headlessWallet = require('headless-byteball');
		headlessWallet.readSingleAddress(address => {
			console.log(`=== Quiz bot wallet address: ${address}`);
			const split = require('headless-byteball/split.js');
			split.startCheckingAndSplittingLargestOutput(address);
		});
		resolve();
	});
});
