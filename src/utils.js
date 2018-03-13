exports.getRandomInt = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

exports.formatTextcoinLink = (textcoin) => `https://byteball.org/#textcoin?${textcoin}`;
