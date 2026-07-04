const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [search, replace] of replacements) {
    // using split join to replace all occurrences without regex escaping issues
    content = content.split(search).join(replace);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// App.jsx
replaceInFile('src/App.jsx', [
  ["['🏢', '🚀', '🌐', '💻', '📈', '🤝', '🛠️', '💎']", "[<Building size={18}/>, <Rocket size={18}/>, <Globe size={18}/>, <Laptop size={18}/>, <TrendingUp size={18}/>, <Handshake size={18}/>, <Wrench size={18}/>, <Gem size={18}/>]"],
  ["`⚠️ RETRASO", "`⚠️ RETRASO"], // We might want to keep the text symbol if it's inside a template string. Wait, if it's a notification string, it can't render JSX!
  // Wait, notifications use strings. Let me check how notifications are rendered. 
]);
