const conf = require('ocore/conf.js');
const mail = require('ocore/mail.js');


function notifyAdmin(subject, body) {
	if (conf.useEmail) {
		console.log('notifyAdmin:\n' + subject + '\n' + body);
		mail.sendmail({
			to: conf.admin_email,
			from: conf.from_email,
			subject: subject,
			body: body
		}, function (err) {
			if (err) console.error(new Error(err));
		});
	} else {
		console.log('notifyAdmin is disabled because of useEmail setting in conf:\n' + subject + '\n' + body);
	}
}

exports.notifyAdmin = notifyAdmin;
