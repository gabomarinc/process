const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// The replacement we did before inserted `<Notifications />`
// I need to change it to `<Notifications onNavigate={(n) => { if (n.instanceId) setSelectedInstanceId(n.instanceId); }} />`
content = content.replace(
  '<Notifications />',
  '<Notifications onNavigate={(n) => { if (n.instanceId) setSelectedInstanceId(n.instanceId); }} />'
);

fs.writeFileSync('src/App.jsx', content);
console.log('App patched');
