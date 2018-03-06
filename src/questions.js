const {getRandomInt} = require('./utils');

const defaultAnswers = [
	{
		id: 1,
		option: 'a',
		text: 'First answer',
	},
	{
		id: 2,
		option: 'b',
		text: 'Second answer',
	},
	{
		id: 3,
		option: 'c',
		text: 'Third answer',
	},
	{
		id: 4,
		option: 'd',
		text: 'Fourth answer',
	},
	{
		id: 5,
		option: 'e',
		text: 'Fifth answer',
	},
	{
		id: 6,
		option: 'f',
		text: 'Sixth answer',
	},
];

const question = (index) => {
	const answers = defaultAnswers.slice(0, getRandomInt(2, defaultAnswers.length));
	return {
		id: index,
		text: `This is ${index} Byteball question`,
		solution: answers[getRandomInt(0, answers.length - 1)].id,
		answers,
	}
};

const questions = Array(10)
	.fill(1)
	.map((item, index) => question(index));

console.log(JSON.stringify(questions, null, 2))

module.exports = questions;
