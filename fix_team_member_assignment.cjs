const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add modifiedTemplateIds global
const importStr = "import './App.css';";
if (!content.includes('let modifiedTemplateIds = new Set();')) {
  content = content.replace(importStr, importStr + '\n\nlet modifiedTemplateIds = new Set();');
}

// 2. Reset in 'Añadir Miembro' click and 'Editar' click
// Añadir Miembro:
// onClick={() => { setShowMemberModal(true); setEditingMember(null); setMemberFormData({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '' }); }}
content = content.replace(
  /onClick=\{\(\) => \{ setShowMemberModal\(true\); setEditingMember\(null\);/g,
  "onClick={() => { modifiedTemplateIds = new Set(); setShowMemberModal(true); setEditingMember(null);"
);

// Editar Miembro:
// onClick={() => { setEditingMember(member); setMemberFormData({ name: member.name, role: member.role, email: member.email, assignedProcesses: member.assignedProcesses || [], department: member.department || '', managerId: member.managerId || '' }); setShowMemberModal(true); }}
content = content.replace(
  /onClick=\{\(\) => \{ setEditingMember\(member\);/g,
  "onClick={() => { modifiedTemplateIds = new Set(); setEditingMember(member);"
);

// 3. Add to set in toggles
content = content.replace(
  /\/\/ Mark as assigned: we update this step's assignedTo inside the template locally/g,
  "// Mark as assigned: we update this step's assignedTo inside the template locally\n                                        modifiedTemplateIds.add(temp.id);"
);

content = content.replace(
  /\/\/ Unassign step/g,
  "// Unassign step\n                                        modifiedTemplateIds.add(temp.id);"
);

// 4. Update handleSaveMember
const oldSaveMemberLogic = `        // Sync the local templates state steps and database with the new memberId assignment
        for (const temp of templates) {
          let hasChanges = false;
          const updatedSteps = temp.steps.map(step => {
            if (step.assignedTo === 'temp_new_member') {
              hasChanges = true;
              return { ...step, assignedTo: memberId };
            }
            return step;
          });
          if (hasChanges) {
            await saveTemplate({ ...temp, steps: updatedSteps });
          }
        }`;

const newSaveMemberLogic = `        // Sync modified templates and database with the new memberId assignment
        for (const temp of templates) {
          let updatedSteps = temp.steps;
          let needsSave = modifiedTemplateIds.has(temp.id);

          // Always replace 'temp_new_member' with the actual memberId
          const mappedSteps = updatedSteps.map(step => {
            if (step.assignedTo === 'temp_new_member') {
              needsSave = true;
              return { ...step, assignedTo: memberId };
            }
            return step;
          });

          if (needsSave) {
            await saveTemplate({ ...temp, steps: mappedSteps });
          }
        }
        modifiedTemplateIds = new Set();`;

content = content.replace(oldSaveMemberLogic, newSaveMemberLogic);

fs.writeFileSync('src/App.jsx', content);
console.log('App patched for team member assignments saving');
