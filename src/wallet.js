const eventBus = require('byteballcore/event_bus.js');
const headlessWallet = require('headless-byteball');
const constants = require('byteballcore/constants.js');
const mutex = require('byteballcore/mutex.js');
const conf = require('byteballcore/conf.js');
const db = require('./db');

const sendTextcoins = (id) => new Promise((resolve, reject) => {
	const address = `textcoin:${id}`;
	const amount = conf.botAmountToSendPerUser + constants.TEXTCOIN_CLAIM_FEE; // bytes
	const opts = {
		asset: null,
		amount,
		to_address: address,
		email_subject: 'Payment in textcoin',
	};

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

exports.sendTextcoins = sendTextcoins;

const processPayment = async (userId) => new Promise((resolve, reject) => {
	mutex.lock([userId], async (unlock) => {
		let user;
		let textcoin;
		try {
			user = await db.findUser(userId);
		} catch (error) {
			console.error(error);
			reject(error);
			return unlock();
		}

		if (user && !user.quiz_pass_date) {
			reject(new Error('User hasn\'t passed test'));
			return unlock();
		}

		if (user && user.payment_date) {
			reject(new Error('User has been already payed'));
			return unlock();
		}

		try {
			textcoin = await sendTextcoins(user.id);
		} catch (error) {
			console.error('Textcoin generation error', error);
			reject(error);
			return unlock();
		}

		try {
			await db.updateUser(user, {
				unit: textcoin.unit,
				textcoin: textcoin.textcoin,
				amount: textcoin.amount,
				payment_date: textcoin.payment_date,
			});
		} catch (error) {
			console.error('User update error', error);
			reject(error);
			return unlock();
		}

		resolve(textcoin);
		return unlock();
	});
});

exports.processPayment = processPayment;

exports.onReady = () => new Promise((resolve) => {
	eventBus.on('headless_wallet_ready', () => {
		// You can use these calls to get headless wallet address to transfer bytes to bot wallet
		/*
		headlessWallet.readSingleWallet(wallet => {
			console.log(`Quiz bot wallet: '${wallet}'`);
			headlessWallet.readSingleAddress(address => {
				console.log(`Quiz bot wallet address: '${address}'`);
			});
		});
		*/
		resolve();
	});
});
