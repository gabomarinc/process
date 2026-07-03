const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add let modifiedTemplateIds = new Set(); at the top
if (!content.includes('let modifiedTemplateIds = new Set();')) {
  content = content.replace("function App() {", "let modifiedTemplateIds = new Set();\n\nfunction App() {");
}

// 2. Fix the "Editar" button to clear the set
const editarBtnOld = `                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                          setEditingMember(member);
                          setMemberFormData({ name: member.name, role: member.role, email: member.email, assignedProcesses: member.assignedProcesses || [], department: member.department || '', managerId: member.managerId || '' });
                          setMemberModalStep(1);
                          setShowEditProfileModal(true);
                        }}>`;

const editarBtnNew = `                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                          modifiedTemplateIds = new Set();
                          setEditingMember(member);
                          setMemberFormData({ name: member.name, role: member.role, email: member.email, assignedProcesses: member.assignedProcesses || [], department: member.department || '', managerId: member.managerId || '' });
                          setMemberModalStep(1);
                          setShowEditProfileModal(true);
                        }}>`;

content = content.replace(editarBtnOld, editarBtnNew);

// 3. Fix the "Agregar Personal" button to clear the set
const addMemberBtnOld = `                <button className="btn btn-primary" onClick={() => {
                  setEditingMember(null);
                  setMemberFormData({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '' });
                  setMemberModalStep(1);
                  setShowMemberModal(true);
                }}>
                  ➕ Agregar Personal
                </button>`;

const addMemberBtnNew = `                <button className="btn btn-primary" onClick={() => {
                  modifiedTemplateIds = new Set();
                  setEditingMember(null);
                  setMemberFormData({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '' });
                  setMemberModalStep(1);
                  setShowMemberModal(true);
                }}>
                  ➕ Agregar Personal
                </button>`;

content = content.replace(addMemberBtnOld, addMemberBtnNew);

// 4. Force String matching for step.assignedTo and option values in the <select> for both execution and template views
content = content.replace(/value=\{step\.assignedTo \|\| ''\}/g, "value={step.assignedTo ? String(step.assignedTo) : ''}");
content = content.replace(/value=\{m\.id\}/g, "value={String(m.id)}");


fs.writeFileSync('src/App.jsx', content);
console.log('Fixed team assignments');
