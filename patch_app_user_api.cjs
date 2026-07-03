const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const targetStr = '<Notifications onNavigate={(n) => { if (n.instanceId) setSelectedInstanceId(n.instanceId); }} />';
// API_BASE_URL is not globally defined in App.jsx (fetch uses relative paths like '/api/...').
// We can just pass apiUrl="" and the fetch will use relative path. 
const replacementStr = '<Notifications user={user} apiUrl="" onNavigate={(n) => { if (n.instanceId) setSelectedInstanceId(n.instanceId); }} />';

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx updated with user and apiUrl');
