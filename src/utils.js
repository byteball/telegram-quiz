exports.getRandomInt = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

exports.formatTextcoinLink = (textcoin) => `https://byteball.org/#textcoin?${textcoin}`;

exports.formatTextcoinMessage = (textcoin) => `Here is your textcoin, click this link and follow the instructions ${exports.formatTextcoinLink(textcoin)}.\n\nIf you see an error that the payment is not confirmed yet, wait about 10 minutes for the confirmation and try again.\n\nJoin our Telegram group @byteball if you are not here yet.`;

exports.escapeMarkdown = (text) => text.replace(/_/g, '\\_');
