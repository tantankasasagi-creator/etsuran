const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const file of ['app.js', 'style.css']) {
  const data = fs.readFileSync(path.join(root, file));
  const hash = crypto.createHash('sha256').update(data).digest('hex').slice(0, 12);
  const extension = path.extname(file);
  const versioned = path.basename(file, extension) + '.' + hash + extension;
  fs.writeFileSync(path.join(output, versioned), data);
  html = html.replace(file, versioned);
}
fs.writeFileSync(path.join(output, 'index.html'), html);
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log('Static site generated in _site with versioned JS/CSS.');
