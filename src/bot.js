const Telegraf = require('telegraf');
const RedisSession = require('telegraf-session-redis');
const {quiz, start} = require('./quiz');
const conf = require('ocore/conf.js');

const bot = new Telegraf(conf.botTelegramToken);
const session = new RedisSession({
	store: {
		host: conf.botRedisSessionHost,
		port: conf.botRedisSessionPort,
	}
});

bot.use(session.middleware());
bot.start(start);
bot.on('callback_query', quiz);

module.exports = bot;
