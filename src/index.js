const Telegraf = require('telegraf');
const RedisSession = require('telegraf-session-redis');
const Router = require('telegraf/router');
const Extra = require('telegraf/extra');

const {getRandomInt, formatTextcoinLink} = require('./utils');
const questions = require('./questions.json');
const db = require('./db');
const wallet = require('./wallet');
const notifications = require('./notifications');

const conf = require('../conf');

const getNextQuestion = (questions, answers) => {
	const notAnsweredQuestions = questions.filter((question) => answers[question.id] === undefined)
	if (notAnsweredQuestions.length === 0) {
		return null;
	}
	console.log('getNextQuestion', questions.length, notAnsweredQuestions.length)
	return notAnsweredQuestions[getRandomInt(0, notAnsweredQuestions.length - 1)];
}

const isNumberOfRightAnswersValid = (questions, answers) => {
	const rightAnswers = questions
		.reduce((result, current) => Object.assign(result, {[current.id]: current.solution}), {});
	const rightAnswersNumber = Object.keys(answers)
		.filter(questionId => {
			console.log(answers[questionId], rightAnswers[questionId])
			return answers[questionId] === rightAnswers[questionId]
		})
		.filter(Boolean);
	console.log('rightAnswersNumber', rightAnswersNumber);
	return rightAnswersNumber.length >= conf.botRequiredNumberOfRightAnswers;
}

const markup = (ctx, showAnswer = false) => {
	const buttons = (m) => {
		if (showAnswer) {
			const nextQuestion = getNextQuestion(questions, ctx.session.answers);
			console.log('nextQuestion', nextQuestion)
			if (isNumberOfRightAnswersValid(questions, ctx.session.answers)) {
				return [
					m.callbackButton(
						'claim bytes',
						`claim`
					)
				];
			} else if (!nextQuestion) {
				return [
					m.callbackButton(
						'start over',
						`start`
					)
				];
			}
			return [
					m.callbackButton(
					'next question',
					`question:${nextQuestion.id}`
				)
			];
		}
		const question = questions.filter((question) => question.id === ctx.session.questionId)[0];
		return question.answers
			.map((answer) => {
				return m.callbackButton(
					answer.option,
					`answer:${ctx.session.questionId}:${answer.id}`
				)
			});
	}
	return Extra
		.markdown()
		.markup((m) => m.inlineKeyboard(buttons(m), { columns: 3 }))
}

const quiz = new Router(({callbackQuery}) => {
	if (!callbackQuery.data) {
		return;
	}
	const parts = callbackQuery.data.split(':');
	console.log(parts)
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
	}
});

quiz.on('question', (ctx) => {
	if (ctx.session.questionId === undefined) {
		return;
	}
	ctx.session.questionId = ctx.state.questionId
	return editText(ctx)
})

quiz.on('answer', (ctx) => {
	console.log('answer');
	if (ctx.session.questionId === undefined) {
		return;
	}
	if (ctx.state.answer) {
		ctx.session.answers[ctx.session.questionId] = ctx.state.answer.id;
	}
	return editText(ctx, true)
})

quiz.on('claim', async (ctx) => {
	let user;
	let textcoin;
	let message;

	try {
		user = await db.findUser(ctx.from.id);
	} catch (error) {
		console.log(error);
	}

	if (!user && isNumberOfRightAnswersValid(questions, ctx.session.answers)) {
		user = {
			id: ctx.from.id,
			chat_id: ctx.chat.id,
			quiz_pass_date: Math.floor(Date.now() / 1000),
		};

		try {
			await db.createUser(user);
		} catch (error) {
			console.log(error);
			message = `Some error occred during saving progress`;
		}
	}

	if (user && user.textcoin) {
		message = `You've already received textcoin ${formatTextcoinLink(user.textcoin)}`;
	} else {
		try {
			const currentPayments = await db.getCurrentPayments();
			console.log('currentPayments', currentPayments);
			const isPaymentLimitReached = currentPayments + conf.botAmountToSendPerUser >= conf.botDailyLimit;
			console.log('isPaymentLimitReached', isPaymentLimitReached);
			if (isPaymentLimitReached) {
				const isPaymentLimitNotificationSent = await db.isPaymentLimitNotificationSent();
				if (!isPaymentLimitNotificationSent) {
					try {
						notifications.notifyAdmin(
							'Quiz: daily limit reached',
							`Quiz:\nCurrent daily payments ${currentPayments}. Limit reached`
						);
						await db.storePaymentLimitNotification(currentPayments);
					} catch (error) {
						console.log(error);
					}
				}
			} else {
				textcoin = await wallet.sendTextcoins(ctx.from.id);

				try {
					await db.updateUser(user, {
						unit: textcoin.unit,
						textcoin: textcoin.textcoin,
						amount: textcoin.amount,
						payment_date: textcoin.payment_date,
					});
				} catch (error) {
					console.log(error);
					message = `Some error occred during saving progress`;
				}
				message = `claim textcoin ${formatTextcoinLink(textcoin.textcoin)}`;
			}
		} catch (error) {
			message = `There was some error during textcoin reward generation. Please try to claim reward later.`;
		}
	}

	console.log(ctx.session);
	if (user && user.textcoin && user.creation_date) {
		ctx.session = null;
	}

	return ctx
		.editMessageText(message)
		.catch(() => undefined);
});

const start = async (ctx) => {
	console.log('start', ctx, ctx.from, ctx.chat);
	let user;
	try {
		user = await db.findUser(ctx.from.id);
	} catch (error) {
		console.log(error);
	}

	ctx.session.questionId = questions[getRandomInt(0, questions.length - 1)].id;
	ctx.session.answers = {};
	console.log(questions);

	if (!user) {
		return ctx.reply(message(ctx, false), markup(ctx, false));
	} else {
		return ctx.reply(
			`You've already received textcoin ${user.textcoin}`,
			Extra
				.markdown()
				.markup((m) => m.inlineKeyboard([m.callbackButton(
					'start quiz again without reward',
					`question:${ctx.session.questionId}`
				)], { columns: 3 }))
		);
	}
}

quiz.on('start', start)

quiz.otherwise((ctx) => ctx.reply('🌯'))

const message = (ctx, showAnswer = false) => {
	console.log(ctx.session);
	const question = questions.filter((question) => question.id === ctx.session.questionId)[0];
	const answers = question.answers
		.map((answer) => {
			const correct = answer.id === question.solution
				? '👍 '
				: '❌ ';
			const selected = showAnswer && answer.id === ctx.session.answers[ctx.session.questionId]
				? ' 👈'
				: '';
			return `${showAnswer ? correct : ''}${answer.option}. ${answer.text}${selected}`
		})
		.join('\n');
	return `${question.text}

And here are answers:

${answers}`;
}

function editText(ctx, showAnswer = false) {
	return ctx
		.editMessageText(message(ctx, showAnswer), markup(ctx, showAnswer))
		.catch(() => undefined)
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
				bot.startPolling();
			})
			.catch((error) => {
				console.error(error)
			});
	})
	.catch((error) => {
		console.error(error)
	});
