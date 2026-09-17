const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.endsWith('.scss')) {
      results.push(filePath);
    }
  });
  return results;
}

const scssFiles = walk(srcDir);

scssFiles.forEach((file) => {
  if (file.includes('theme.scss')) return;

  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace hardcoded shadows with theme variable
  content = content.replace(/box-shadow:\s*0\s+\d+px\s+\d+px\s+rgba\([^)]+\);/g, 'box-shadow: $shadow-md;');
  
  // Replace hardcoded border-radiuses with theme variables
  content = content.replace(/border-radius:\s*16px;/g, 'border-radius: $radius-sm;');
  content = content.replace(/border-radius:\s*20px;/g, 'border-radius: $radius-md;');
  content = content.replace(/border-radius:\s*24px;/g, 'border-radius: $radius-md;');
  content = content.replace(/border-radius:\s*28px;/g, 'border-radius: $radius-lg;');
  content = content.replace(/border-radius:\s*32px;/g, 'border-radius: $radius-lg;');
  content = content.replace(/border-radius:\s*40px;/g, 'border-radius: $radius-xl;');
  content = content.replace(/border-radius:\s*48px;/g, 'border-radius: $radius-xl;');
  
  // Replace pure white cards with glassmorphism if it has rgba(255,255,255, 0.9x)
  content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.9[0-9]\);/g, '@include glass;');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${path.relative(srcDir, file)}`);
  }
});
