const eventBus = require('byteballcore/event_bus.js');
const headlessWallet = require('headless-byteball');
const constants = require('byteballcore/constants.js');
const conf = require('../conf');

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
