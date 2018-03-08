const async = require('async');
const db = require('byteballcore/db.js');
const constants = require('byteballcore/constants.js');
const conf = require('../conf');
const notifications = require('./notifications');
const debug = require('debug')(`app:${__filename}`);

exports.findUser = (id) => new Promise((resolve, reject) => {
	db.query('SELECT * FROM quiz_users WHERE id=?', [id], rows => {
		if (rows.length === 0) {
			return reject('user ' + id + ' not found');
		}
		return resolve(rows[0]);
	});
});

exports.createUser = (item) => new Promise((resolve) => {
	db.query(
		`INSERT INTO quiz_users (\n\
			id, chat_id, unit, textcoin, amount, \n\
			payment_date, quiz_pass_date \n\
		) VALUES (?,?,?,?,?,${db.getFromUnixTime('?')},${db.getFromUnixTime('?')})`,
		[
			item.id,
			item.chat_id,
			item.unit,
			item.textcoin,
			item.amount,
			item.payment_date,
			item.quiz_pass_date,
		],
		() => {
			resolve();
		}
	);
});

exports.updateUser = (item, update) => new Promise((resolve) => {
	const updatedItem = Object.assign({}, item, update);
	db.query(
		`INSERT OR REPLACE INTO quiz_users (\n\
			id, chat_id, unit, textcoin, amount, \n\
			payment_date, quiz_pass_date \n\
		) VALUES (?,?,?,?,?,${db.getFromUnixTime('?')},?)`,
		[
			item.id,
			item.chat_id,
			updatedItem.unit,
			updatedItem.textcoin,
			updatedItem.amount,
			updatedItem.payment_date,
			item.quiz_pass_date,
		],
		() => {
			resolve();
		}
	);
});

exports.getUserPassedQuizNotPaid = () => new Promise((resolve) => {
	db.query('SELECT * FROM quiz_users WHERE quiz_pass_date IS NOT NULL AND payment_date IS NULL', rows => {
		return resolve(rows[0]);
	});
});

const getCurrentPayments = () => new Promise((resolve) => {
	db.query(
		'SELECT SUM(amount) as sum FROM quiz_users WHERE date(payment_date) = date(\'now\') GROUP BY date(payment_date)',
		rows => {
			if (rows.length === 0) {
				return resolve(0);
			}
			return resolve(rows[0].sum);
		}
	);
});
exports.getCurrentPayments = getCurrentPayments;

const checkPaymentLimitNotificationSent = () => new Promise((resolve) => {
	db.query('SELECT * FROM quiz_admin_notifications WHERE date(creation_date) = date(\'now\')', rows => {
		if (rows.length === 0) {
			return resolve(false);
		}
		return resolve(true);
	});
});
exports.checkPaymentLimitNotificationSent = checkPaymentLimitNotificationSent;

const storePaymentLimitNotification = (amount) => new Promise((resolve) => {
	db.query(
		'INSERT INTO quiz_admin_notifications (amount) VALUES (?)',
		[
			amount
		],
		() => {
			resolve();
		}
	);
});
exports.storePaymentLimitNotification = storePaymentLimitNotification;

exports.checkPaymentLimitReached = async () => {
	const currentPayments = await getCurrentPayments();
	const amountToSend = conf.botAmountToSendPerUser + constants.TEXTCOIN_CLAIM_FEE;
	const isPaymentLimitReached = currentPayments + amountToSend >= conf.botDailyLimit;
	if (isPaymentLimitReached) {
		const isPaymentLimitNotificationSent = await checkPaymentLimitNotificationSent();
		if (!isPaymentLimitNotificationSent) {
			try {
				notifications.notifyAdmin(
					'Quiz: daily limit reached',
					`Quiz:\nCurrent daily payments ${currentPayments}. Limit reached`
				);
				await storePaymentLimitNotification(currentPayments);
			} catch (error) {
				console.error(error);
			}
		}
	}
	return isPaymentLimitReached;
};

const migrateDb = (connection, onDone) => {
	let arrQueries = [];
	connection.addQuery(arrQueries, `CREATE TABLE IF NOT EXISTS quiz_users ( \n\
		id INTEGER PRIMARY KEY, \n\
		chat_id INTEGER NOT NULL, \n\
		unit CHAR(44) NULL, \n\
		amount BIGINT NULL, \n\
		textcoin TEXT NULL, \n\
		payment_date TIMESTAMP NULL, \n\
		creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, \n\
		quiz_pass_date TIMESTAMP NULL
	);`);
	connection.addQuery(arrQueries, `CREATE TABLE IF NOT EXISTS quiz_admin_notifications ( \n\
		id INTEGER PRIMARY KEY AUTOINCREMENT, \n\
		amount BIGINT NULL, \n\
		creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`);
	async.series(arrQueries, () => {
		onDone();
	});
};

exports.connect = () => new Promise((resolve) => {
	debug('Connecting to db');
	migrateDb(db, () => {
		debug('Checked migrations');
		resolve();
	});
});
