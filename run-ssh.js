const { execSync } = require('child_process');
const fs = require('fs');

let cmd = process.argv.slice(2).join(' ');
if (!cmd && fs.existsSync('cmd.sh')) {
  cmd = fs.readFileSync('cmd.sh', 'utf-8');
}

if (!cmd) {
  console.error('No command provided');
  process.exit(1);
}

cmd = cmd.replace(/\r\n/g, '\n');

try {
  const result = execSync('ssh -o StrictHostKeyChecking=no root@172.86.119.202 bash', {
    input: cmd,
    encoding: 'utf-8',
    timeout: 60000,
  });
  console.log(result);
} catch (err) {
  if (err.stdout) console.log(err.stdout);
  if (err.stderr) console.error(err.stderr);
  process.exit(err.status || 1);
}
