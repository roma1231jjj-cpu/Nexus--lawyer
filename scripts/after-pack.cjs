const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const strings = (pkg) => ({
  ProductName: pkg.productName,
  FileDescription: pkg.description,
  CompanyName: 'Nexus × АутSquad',
  LegalCopyright: 'Nexus × АутSquad',
  OriginalFilename: `${pkg.name}.exe`,
  InternalName: pkg.productName
});

module.exports = async (context) => {
  const pkg = JSON.parse(fs.readFileSync(path.join(context.packager.projectDir, 'package.json'), 'utf8'));
  const rcedit = path.join(context.packager.projectDir, 'build', 'rcedit-x64.exe');
  const icon = path.join(context.packager.projectDir, 'build', 'icon.ico');

  if (!fs.existsSync(rcedit) || !fs.existsSync(icon)) {
    console.warn('after-pack: rcedit или icon.ico не найдены, ресурсная информация не обновлена');
    return;
  }

  const candidates = fs
    .readdirSync(context.appOutDir)
    .filter((name) => name.endsWith('.exe'))
    .map((name) => path.join(context.appOutDir, name));

  for (const exe of candidates) {
    const args = [exe, '--set-icon', icon, '--set-file-version', pkg.version, '--set-product-version', pkg.version];
    for (const [key, value] of Object.entries(strings(pkg))) {
      if (value) args.push('--set-version-string', key, String(value));
    }
    const result = spawnSync(rcedit, args, { stdio: 'pipe' });
    if (result.status !== 0) {
      console.warn(`after-pack: не удалось обновить ${path.basename(exe)}: ${result.stderr?.toString().slice(0, 200)}`);
    } else {
      console.log(`after-pack: ресурсы обновлены — ${path.basename(exe)}`);
    }
  }
};
