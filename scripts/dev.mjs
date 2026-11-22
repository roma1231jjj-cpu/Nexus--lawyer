import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const vite = spawn(npx, ['vite', '--port', '5271', '--strictPort'], { stdio: 'inherit', shell: process.platform === 'win32' });

const electronBin = path.join('node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const start = async () => {
  await wait(2500);
  const electron = spawn(electronBin, ['.'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: (() => { const env = { ...process.env, VITE_DEV_SERVER_URL: 'http://localhost:5271'  }; delete env.ELECTRON_RUN_AS_NODE; return env; })()
  });
  electron.on('exit', (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });
};

start();
