const desktopApp = require('ocore/desktop_app.js');
const Router = require('telegraf/router');
const Extra = require('telegraf/extra');

const {getRandomInt, formatTextcoinLink, formatTextcoinMessage, escapeMarkdown} = require('./utils');
const db = require('./db');
const wallet = require('./wallet');

const conf = require('ocore/conf.js');
const debug = require('debug')(`app:${__filename}`);

const QUESTIONS_FILE_PATH = `${desktopApp.getAppDataDir()}/questions.json`;
const questions = require(QUESTIONS_FILE_PATH);

const ROUTE_SEPARATOR = ':';
const ROUTE_ACTION_INDEX = 0;
const ROUTE_QUESTION_ID_INDEX = 1;
const ROUTE_ANSWER_OPTION_INDEX = 2;

const INLINE_KEYBOARD_COLUMNS = 3;

const USER_SELECTED_ICON = '\u{1F448}';
const DEFAULT_ANSWER_ICON = '\u{26AA}';
const CORRECT_ANSWER_ICON = '\u{2705}';

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

const getMarkup = (ctx, showAnswer = false) => {
	const buttons = (m) => {
		if (showAnswer) {
			const nextQuestion = getNextQuestion(questions, ctx.session.answers);
			if (isNumberOfCorrectAnswersEnoughForReward(questions, ctx.session.answers)) {
				return [m.callbackButton('Claim bytes', 'claim')];
			} else if (!nextQuestion) {
				return [m.callbackButton('Start over', 'start-quiz')];
			}
			return [m.callbackButton('Next question', ['question', nextQuestion.id].join(ROUTE_SEPARATOR))];
		}
		const question = questions.filter((question) => question.id === ctx.session.questionId)[0];
		return question.answers
			.map((answer) => {
				return m.callbackButton(answer.option, ['answer', ctx.session.questionId, answer.option].join(ROUTE_SEPARATOR));
			});
	};

	return Extra
		.markdown()
		.markup((m) => m.inlineKeyboard(buttons(m), { columns: INLINE_KEYBOARD_COLUMNS }));
};

const quiz = new Router(({ callbackQuery }) => {
	if (!callbackQuery.data) {
		return;
	}
	const parts = callbackQuery.data.split(ROUTE_SEPARATOR);
	const route = parts[ROUTE_ACTION_INDEX];
	debug('Route', route);
	if (parts.length === 1) {
		return {
			route,
		};
	}
	const questionId = parseInt(parts[ROUTE_QUESTION_ID_INDEX], 10);
	const answerOption = parts[ROUTE_ANSWER_OPTION_INDEX];
	const question = questions.filter((question) => question.id === questionId)[0];
	if (!question) {
		return;
	}
	const answer = question.answers.filter((answer) => answer.option === answerOption)[0];
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
		ctx.session.answers[ctx.session.questionId] = ctx.state.answer.option;
	}
	return editText(ctx, true);
});

quiz.on('claim', async (ctx) => {
	let user;
	let message;

	const startButtonText = 'Start quiz again without reward';

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
			message = 'Some error occured during saving';
		}
	}

	if (user && user.textcoin) {
		message = `You've already received your textcoin ${formatTextcoinLink(user.textcoin)}`;
	} else if (user && user.quiz_pass_date) {
		const isPaymentLimitReached = await db.checkPaymentLimitReached();
		if (!isPaymentLimitReached) {
			let objTextcoin;
			try {
				objTextcoin = await wallet.processPayment(user.id);
				message = formatTextcoinMessage(objTextcoin.textcoin);
			} catch (error) {
				message = 'There was an error while trying to send your textcoin. We\'ll automatically retry until the textcoin is sent.';
				console.error('User update error', error);
			}
		} else {
			message = 'Daily quota has been reached.\n'
				+ 'We will send your textcoin when the quota clears';
		}
	}

	if (user && user.textcoin && user.creation_date) {
		ctx.session = null;
	}

	return ctx
		.editMessageText(
			message,
			Extra
				.markdown()
				.markup((m) => m.inlineKeyboard([m.callbackButton(
					startButtonText,
					'start-quiz'
				)], { columns: INLINE_KEYBOARD_COLUMNS }))
		)
		.catch((error) => {} /*console.error(error)*/);
});

const startQuiz = async (ctx) => {
	ctx.session.questionId = questions[getRandomInt(0, questions.length - 1)].id;
	ctx.session.answers = {};

	return ctx.reply(getMessage(ctx, false), getMarkup(ctx, false)).catch( (error) => console.error('startQuiz', error) );
};

quiz.on('start-quiz', startQuiz);

const start = async (ctx) => {
	let user;
	try {
		user = await db.findUser(ctx.from.id);
	} catch (error) {
		console.error(error);
	}

	let welcome = 'Hello and welcome to Obyte quiz!\n\n'
		+ `Here you can answer questions about Obyte and earn $${conf.botRewardInUSD.toLocaleString([], {minimumFractionDigits: 2})} in Bytes for correctly answering the questions. If you have difficulties answering any questions, find help on our website https://obyte.org, wiki https://wiki.obyte.org, and Telegram group @obyteorg\n\n`;
	let message = welcome;
	let startButtonText;
	if (!user) {
		startButtonText = 'Start quiz';
	} else if (user && !user.textcoin) {
		message += 
			'We\'ve noticed that you\'ve already been here, but for some reason haven\'t received your reward\n'
			+ 'Please proceed to get your reward\n';
		startButtonText = 'Start quiz again';
	} else if (user && user.textcoin) {
		message +=
			'We\'ve noticed that you\'ve already been here and earned your textcoin.\n\n'
			+ 'Here is your textcoin link again ' + formatTextcoinLink(user.textcoin) + '\n';
		startButtonText = 'Start quiz again without reward';
	}
	return ctx.reply(
		message,
		Extra
			.markdown()
			.markup((m) => m.inlineKeyboard([m.callbackButton(
				startButtonText,
				'start-quiz'
			)], { columns: INLINE_KEYBOARD_COLUMNS }))
	).catch( (error) => console.error('start', error) );
};

quiz.otherwise(start);

const getMessage = (ctx, showAnswer = false) => {
	const question = questions.filter((question) => question.id === ctx.session.questionId)[0];
	let isUserAnswerCorrect = false;
	let correctAnswerOption = '';
	let selectedAnswerOption = '';
	const answers = question.answers
		.map((answer) => {
			const isCorrect = answer.option === question.solution;
			const isSelected = showAnswer && answer.option === ctx.session.answers[ctx.session.questionId];
			const userSelectedIcon = isSelected
				? USER_SELECTED_ICON
				: '';
			const isCorrectIcon = showAnswer && isCorrect
				? CORRECT_ANSWER_ICON
				: DEFAULT_ANSWER_ICON;
			if (isSelected && isCorrect) {
				isUserAnswerCorrect = true;
			}
			if (showAnswer && isCorrect) {
				correctAnswerOption = answer.option;
			}
			if (isSelected) {
				selectedAnswerOption = answer.option;
			}
			return `${isCorrectIcon}\t${answer.option}.\t${answer.text}\t${userSelectedIcon}`;
		})
		.join('\n');
	let answerMessage = '';
	if (showAnswer) {
		answerMessage = isUserAnswerCorrect
			? 'Correct!'
			: `Sorry, the correct answer is *${correctAnswerOption}*.`;
		answerMessage += ' ' + escapeMarkdown(question.comment);
		if (isNumberOfCorrectAnswersEnoughForReward(questions, ctx.session.answers))
			answerMessage += '\n\nCongratulations, you answered the required number of questions and earned a reward!';
	}
	return `${question.text}

${answers}

${answerMessage}`;
};

function editText(ctx, showAnswer = false) {
	return ctx
		.editMessageText(getMessage(ctx, showAnswer), getMarkup(ctx, showAnswer))
		.catch((error) => {} /*console.error(error)*/);
}

exports.quiz = quiz;
exports.start = start;
