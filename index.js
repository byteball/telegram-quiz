const child_process = require('child_process');
const path = require('path');

const wallet_password = '';

const app_path = path.resolve(__dirname, 'src', 'index.js');
console.log(app_path);

const child = child_process.spawn('node', [app_path]);
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

child.stdin.write(`${wallet_password}\n`);
