const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const gas = path.join(root, 'gas');
fs.mkdirSync(gas, { recursive: true });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace('<head>', '<head>\n  <base target="_top">')
  .replace('<link rel="stylesheet" href="style.css">', "<?!= include('style'); ?>")
  .replace('<script src="app.js"></script>', "<?!= include('script'); ?>");
if (!html.includes("include('style')") || !html.includes("include('script')")) throw new Error('Could not locate script/style includes');
fs.writeFileSync(path.join(gas, 'index.html'), html);
fs.writeFileSync(path.join(gas, 'script.html'), '<script>\n' + fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n</script>\n');
fs.writeFileSync(path.join(gas, 'style.html'), '<style>\n' + fs.readFileSync(path.join(root, 'style.css'), 'utf8') + '\n</style>\n');
console.log('GAS package generated: gas/index.html, script.html, style.html (Code.gs retained).');
