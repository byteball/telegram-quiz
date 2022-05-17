# telegram-quiz

Telegram chatbot that allows users to pass a quiz and get some Bytes

## Installation

- You need node and npm 8+ installed.
- Run `npm install` to install dependencies
- You need to install redis for bot sessions
- You need to have mail server to receive daily payments notifications (for example setup gmail smtp access).
	Although you can disable email usage altogether with `useEmail` option
- You can check most of the available options in `conf.js`.
	Check options in `conf.js` and make sure all is set right.
	To override these settings add options to `conf.json` in app data dir.
- Copy `questions.sample.json` from app root to `questions.json` in app data dir (It's sample questions,
	feel free to add or edit `questions.json` according to your needs, but keep original structure and field names,
	so that bot could use questions)
- Run `npm start` to start bot.
- If you don't see any errors in console try to write a message to your bot (`/start`)

## Test payments on testnet

- You can get testnet client and claim some testnet bytes for testing [here](https://obyte.org/testnet)
- When you start the bot it starts [headless-obyte](https://github.com/byteball/headless-obyte)
- To enable testnet, place an `.env` file with `testnet=1` in the root folder

## Transfer bytes to the bot

- To transfer bytes to headless wallet you could use [these instructions](https://github.com/byteball/headless-obyte#remote-control)
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

## Run bow with pm2

When you start the bot with `npm start` you will be asked to provide a passphrase for the bot's wallet.
You can check out `testnet-index.js` script in the app root where you can see example of how to start the bot with a passphrase
read from a file.

__WARNING!__ It is not recomended way of running the bot because of security concerns.
Make sure you understand what you are doing before sending funds to such a setup.
