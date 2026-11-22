import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const jobs = [
  { target: 'portable', out: 'release-portable-exe', artifact: 'nexus-lawyer-${version}-portable.${ext}', hint: 'portable exe' },
  { target: 'zip', out: 'release-portable-zip', artifact: 'nexus-lawyer-${version}-portable.${ext}', hint: 'portable zip' },
  { target: 'nsis', out: 'release-installer', artifact: 'nexus-lawyer-setup-${version}.${ext}', hint: 'установщик' }
];

const cli = path.join('node_modules', 'electron-builder', 'cli.js');

for (const job of jobs) {
  fs.rmSync(job.out, { recursive: true, force: true });
  console.log(`\n=== ${job.hint} -> ${job.out}`);
  const result = spawnSync(
    process.execPath,
    [cli, '--win', job.target, `--config.directories.output=${job.out}`, `--config.win.target=${job.target}`, `--config.artifactName=${job.artifact}`, '--publish', 'never'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        ELECTRON_BUILDER_BINARIES_MIRROR: process.env.ELECTRON_BUILDER_BINARIES_MIRROR || 'https://npmmirror.com/mirrors/electron-builder-binaries/'
      }
    }
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const versionDir = path.join('versions', `v${pkg.version}`);
const artifactsDir = path.join(versionDir, 'artifacts');
fs.mkdirSync(artifactsDir, { recursive: true });

const summary = [];
for (const job of jobs) {
  if (!fs.existsSync(job.out)) continue;
  for (const name of fs.readdirSync(job.out)) {
    const source = path.join(job.out, name);
    if (!fs.statSync(source).isFile() || source.endsWith('.yml')) continue;
    const size = fs.statSync(source).size;
    fs.copyFileSync(source, path.join(artifactsDir, name));
    const sha256 = createHash('sha256').update(fs.readFileSync(source)).digest('hex');
    summary.push({ kind: job.hint, folder: job.out, file: name, bytes: size, sha256 });
  }
}

fs.writeFileSync(
  path.join(versionDir, 'manifest.json'),
  JSON.stringify({ version: pkg.version, builtAt: new Date().toISOString(), product: pkg.productName, files: summary }, null, 2)
);

const versions = JSON.parse(fs.readFileSync(path.join('resources', 'versions.json'), 'utf8'));
fs.writeFileSync(path.join('versions', 'latest.json'), JSON.stringify({ version: pkg.version, channel: 'stable', versions }, null, 2));

console.log(`\nГотово. Артефакты разложены по папкам, копии и манифест: ${versionDir}`);
for (const item of summary) console.log(` - ${item.folder}/${item.file} (${(item.bytes / 1024 / 1024).toFixed(1)} МБ)`);
