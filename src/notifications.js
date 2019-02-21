const conf = require('ocore/conf.js');
const mail = require('ocore/mail.js');
const emailjs = require('emailjs');

let server;

if (conf.useSmtp && conf.useEmail) {
	server = emailjs.server.connect({
		user: conf.smtpUser,
		password: conf.smtpPassword,
		host: conf.smtpHost,
		ssl: true
	});
}

function notifyAdmin(subject, body) {
	if (conf.useEmail) {
		console.log('notifyAdmin:\n' + subject + '\n' + body);
		if (conf.useSmtp) {
			server.send({
				text: body,
				from: 'Server <' + conf.from_email + '>',
				to: 'You <' + conf.admin_email + '>',
				subject: subject
			}, function (err) {
				if (err) console.error(new Error(err));
			});
		} else {
			mail.sendmail({
				to: conf.admin_email,
				from: conf.from_email,
				subject: subject,
				body: body
			}, function (err) {
				if (err) console.error(new Error(err));
			});
		}
	} else {
		console.log('notifyAdmin is disabled because of useEmail setting in conf:\n' + subject + '\n' + body);
	}
}

exports.notifyAdmin = notifyAdmin;
