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

## Run bow with pm2

When you start bot with `npm start` you will be asked to provide passphrase for bot wallet.
You can check out `testnet-index.js` script in app root where you can see example of how to start bot with providing passphrase
from file.

__WARNING!__ It is not recomended way of running bot because of security reason.
Make sure you understand what you are doing before sending funds to such setup.
