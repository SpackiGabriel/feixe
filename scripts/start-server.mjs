import { spawn } from 'node:child_process';

const command = process.platform === 'win32' ? 'python' : 'python3';
const server = spawn(command, ['-m', 'http.server', '8000'], {
  stdio: 'inherit',
});

server.on('error', (error) => {
  console.error(`Could not start Python (${command}): ${error.message}`);
  process.exitCode = 1;
});

server.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
