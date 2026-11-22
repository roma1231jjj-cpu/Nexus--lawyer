import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const electron = path.join('node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
fs.mkdirSync('screenshots', { recursive: true });

const result = spawnSync(electron, ['.', '--shots'], { stdio: 'inherit', shell: process.platform === 'win32', env: (() => { const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE; return env; })() });
if (result.status !== 0) process.exit(result.status ?? 1);

const files = fs.readdirSync('screenshots');
console.log(`Скриншотов: ${files.length}`);
for (const file of files) console.log(` - screenshots/${file}`);
