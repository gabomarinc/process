const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const target = `        modifiedTemplateIds = new Set();

        setShowMemberModal(false);
        setEditingMember(null);
        setMemberFormData({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '' });`;

const replacement = `        modifiedTemplateIds = new Set();

        setShowMemberModal(false);
        setShowEditProfileModal(false);
        setEditingMember(null);
        setMemberFormData({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '' });
        showAlert("¡Perfil guardado con éxito!");`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.jsx', content);
