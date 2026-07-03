const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(/s\.assignedTo === m\.id/g, "String(s.assignedTo) === String(m.id)");
content = content.replace(/s\.assignedTo === member\.id/g, "String(s.assignedTo) === String(member.id)");
content = content.replace(/step\.assignedTo === \(editingMember\?\.id \|\| 'temp_new_member'\)/g, "String(step.assignedTo) === String(editingMember?.id || 'temp_new_member')");
content = content.replace(/updatedSteps\[sIdx\]\.assignedTo === \(editingMember\?\.id \|\| 'temp_new_member'\)/g, "String(updatedSteps[sIdx].assignedTo) === String(editingMember?.id || 'temp_new_member')");

fs.writeFileSync('src/App.jsx', content);
console.log('Fixed all strict equality bugs in App.jsx for assignedTo');
