const fs = require('fs');
const path = require('path');
const dir = 'd:/Desktop/Raw code/consumer-site';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
let count = 0;

for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  
  const originalLength = content.length;
  
  // Replace multiline (home.html style)
  content = content.replace(/[\t ]*<a href="recharge\.html" class="nav-item" data-page="recharge">[\s\S]*?<\/a>\r?\n/g, '');
  content = content.replace(/[\t ]*<a href="promotion\.html" class="nav-item" data-page="promotion">[\s\S]*?<\/a>\r?\n/g, '');
  
  // Replace single-line (orders.html style)
  content = content.replace(/[\t ]*<a href="recharge\.html" class="nav-item" data-page="recharge">.*?<\/a>\r?\n?/g, '');
  content = content.replace(/[\t ]*<a href="promotion\.html" class="nav-item" data-page="promotion">.*?<\/a>\r?\n?/g, '');
  
  if (content.length !== originalLength) {
    fs.writeFileSync(p, content, 'utf8');
    count++;
  }
}

console.log(`Updated ${count} files.`);
