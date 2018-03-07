# Byteball Quiz Bot

Quiz to test your yteball knowledge.

## Installation

- You need node and npm 8+ installed.
- Run `npm install` to install dependencies
- You need to install redis for bot sessions
- You need to have mail server to receive daily payments notifications
- Copy `conf.sample.js` to `conf.js`
- Copy `questions.sample.json` to `questions.json` (It's sample questions,
	feel free to add or edit `questions.json` according to your needs, but keep original structure and field names,
	so that bot could use questions)
- Check options in `conf.js` and make sure all is set right
- Run `npm start` to start bot
- If you don't see any errors in console try to write a message to your bot (`/start`)

## Test payments on test net

- You can get test net client and claim some testnet bytes for testing [here](https://byteball.org/testnet.html)
- When you start bot it starts [headless-byteball](https://github.com/byteball/headless-byteball)
- Here is a [fix](https://github.com/byteball/headless-byteball/issues/2) for connecting headless-byteball to testnet

## Transfer bytes to bot

- To transfer bytes to headless wallet you could use [these instructions](https://github.com/byteball/headless-byteball#remote-control)
- If you have trouble with pairing with remote device you could try to use this code to get wallet address
	```
	headlessWallet.readSingleWallet(wallet => {
		console.log(`Quiz bot wallet: '${wallet}'`);
		headlessWallet.readSingleAddress(address => {
			console.log(`Quiz bot wallet address: '${address}'`);
		});
	});
	```
	Be careful because it will throw errors if there are more than one wallet or addresses
