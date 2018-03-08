const Telegraf = require('telegraf');
const RedisSession = require('telegraf-session-redis');
const Router = require('telegraf/router');
const Extra = require('telegraf/extra');

const {getRandomInt, formatTextcoinLink} = require('./utils');
const questions = require('./../questions.json');
const db = require('./db');
const wallet = require('./wallet');
const processFailedPayments = require('./process-failed-payments');

const conf = require('../conf');
const debug = require('debug')(`app:${__filename}`);

const ROUTE_SEPARATOR = ':';

const getNextQuestion = (questions, answers) => {
	const notAnsweredQuestions = questions.filter((question) => answers[question.id] === undefined);
	if (notAnsweredQuestions.length === 0) {
		return null;
	}
	return notAnsweredQuestions[getRandomInt(0, notAnsweredQuestions.length - 1)];
};

const isNumberOfCorrectAnswersEnoughForReward = (questions, answers) => {
	const rightAnswers = questions
		.reduce((result, current) => Object.assign(result, { [current.id]: current.solution }), {});
	const rightAnswersNumber = Object.keys(answers)
		.filter(questionId => answers[questionId] === rightAnswers[questionId])
		.filter(Boolean);
	return rightAnswersNumber.length >= conf.botRequiredNumberOfRightAnswers;
};

const markup = (ctx, showAnswer = false) => {
	const buttons = (m) => {
		if (showAnswer) {
			const nextQuestion = getNextQuestion(questions, ctx.session.answers);
			if (isNumberOfCorrectAnswersEnoughForReward(questions, ctx.session.answers)) {
				return [m.callbackButton('Claim bytes', 'claim')];
			} else if (!nextQuestion) {
				return [m.callbackButton('Start over', 'start')];
			}
			return [m.callbackButton('Next question', ['question', nextQuestion.id].join(ROUTE_SEPARATOR))];
		}
		const question = questions.filter((question) => question.id === ctx.session.questionId)[0];
		return question.answers
			.map((answer) => {
				return m.callbackButton(answer.option, ['answer', ctx.session.questionId, answer.id].join(ROUTE_SEPARATOR));
			});
	};

	return Extra
		.markdown()
		.markup((m) => m.inlineKeyboard(buttons(m), { columns: 3 }));
};

const quiz = new Router(({ callbackQuery }) => {
	if (!callbackQuery.data) {
		return;
	}
	const parts = callbackQuery.data.split(ROUTE_SEPARATOR);
	const route = parts[0];
	if (parts.length === 1) {
		return {
			route,
		};
	}
	const questionId = parseInt(parts[1], 10);
	const answerId = parseInt(parts[2], 10);
	const question = questions.filter((question) => question.id === questionId)[0];
	if (!question) {
		return;
	}
	const answer = question.answers.filter((answer) => answer.id === answerId)[0];
	return {
		route,
		state: {
			questionId,
			answer,
		}
	};
});

quiz.on('question', (ctx) => {
	if (ctx.session.questionId === undefined) {
		return;
	}
	ctx.session.questionId = ctx.state.questionId;
	return editText(ctx);
});

quiz.on('answer', (ctx) => {
	if (ctx.session.questionId === undefined) {
		return;
	}
	if (ctx.state.answer) {
		ctx.session.answers[ctx.session.questionId] = ctx.state.answer.id;
	}
	return editText(ctx, true);
});

quiz.on('claim', async (ctx) => {
	let user;
	let textcoin;
	let message;

	try {
		user = await db.findUser(ctx.from.id);
	} catch (error) {
		console.error(error);
	}

	if (!user && isNumberOfCorrectAnswersEnoughForReward(questions, ctx.session.answers)) {
		user = {
			id: ctx.from.id,
			chat_id: ctx.chat.id,
			quiz_pass_date: Math.floor(Date.now() / 1000),
		};

		try {
			await db.createUser(user);
		} catch (error) {
			console.error(error);
			message = 'Some error occred during saving progress';
		}
	}

	if (user && user.textcoin) {
		message = `You've already received textcoin ${formatTextcoinLink(user.textcoin)}`;
	} else {
		try {
			const isPaymentLimitReached = await db.checkPaymentLimitReached();
			if (!isPaymentLimitReached) {
				textcoin = await wallet.sendTextcoins(ctx.from.id);

				try {
					await db.updateUser(user, {
						unit: textcoin.unit,
						textcoin: textcoin.textcoin,
						amount: textcoin.amount,
						payment_date: textcoin.payment_date,
					});
				} catch (error) {
					console.error(error);
					message = 'Some error occred during saving progress';
				}
				message = `Claim textcoin ${formatTextcoinLink(textcoin.textcoin)}`;
			} else {
				message = 'Currently payment limit has been reached.\n'
					+ 'We will send you textcoin when new textcoins will be available';
			}
		} catch (error) {
			message = 'There was some error during textcoin reward generation. Please try to claim reward later.';
		}
	}

	if (user && user.textcoin && user.creation_date) {
		ctx.session = null;
	}

	return ctx
		.editMessageText(message)
		.catch((error) => console.error(error));
});

const start = async (ctx) => {
	let user;
	try {
		user = await db.findUser(ctx.from.id);
	} catch (error) {
		console.error(error);
	}

	ctx.session.questionId = questions[getRandomInt(0, questions.length - 1)].id;
	ctx.session.answers = {};

	if (!user || (user && !user.textcoin)) {
		return ctx.reply(message(ctx, false), markup(ctx, false));
	} else {
		return ctx.reply(
			`You've already received textcoin ${formatTextcoinLink(user.textcoin)}`,
			Extra
				.markdown()
				.markup((m) => m.inlineKeyboard([m.callbackButton(
					'Start quiz again without reward',
					['question', ctx.session.questionId].join(ROUTE_SEPARATOR)
				)], { columns: 3 }))
		);
	}
};

quiz.on('start', start);

quiz.otherwise((ctx) => ctx.reply('🌯'));

const message = (ctx, showAnswer = false) => {
	const question = questions.filter((question) => question.id === ctx.session.questionId)[0];
	let isUserAnswerCorrect = false;
	let correctAnswerOption = '';
	let selectedAnswerOption = '';
	const answers = question.answers
		.map((answer) => {
			const isCorrect = answer.id === question.solution
				? true
				: false;
			const selected = showAnswer && answer.id === ctx.session.answers[ctx.session.questionId]
				? true
				: false;
			const isCorrectIcon = showAnswer && isCorrect
				? '\u{2705}\t'
				: '\u{26AA}\t';
			if (selected && isCorrect) {
				isUserAnswerCorrect = true;
			}
			if (showAnswer && isCorrect) {
				correctAnswerOption = answer.option;
			}
			if (selected) {
				selectedAnswerOption = answer.option;
			}
			return `${isCorrectIcon}${answer.option}.\t${answer.text}`;
		})
		.join('\n');
	let answerMessage = '';
	if (showAnswer) {
		answerMessage = isUserAnswerCorrect
			? 'Correct!'
			: `Incorrect *${selectedAnswerOption}*, the right answer is *${correctAnswerOption}*`;
	}
	return `${question.text}

And here are answers:

${answers}

${answerMessage}`;
};

function editText(ctx, showAnswer = false) {
	return ctx
		.editMessageText(message(ctx, showAnswer), markup(ctx, showAnswer))
		.catch((error) => console.error(error));
}

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

db.connect()
	.then(() => {
		wallet.onReady()
			.then(() => {
				debug('Start bot');

				bot.startPolling();

				processFailedPayments.run(bot);
			})
			.catch((error) => {
				console.error(error);
			});
	})
	.catch((error) => {
		console.error(error);
	});
