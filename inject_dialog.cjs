const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const importStr = "import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from '@/components/ui/dialog';";

if (!content.includes('@/components/ui/dialog')) {
  content = content.replace("import './App.css';", "import './App.css';\n" + importStr);
}

// Ensure alias @ maps to src in Vite, or just use relative path
content = content.replace("@/components/ui/dialog", "./components/ui/dialog");

// Add state for edit profile modal
if (!content.includes('const [showEditProfileModal, setShowEditProfileModal]')) {
  content = content.replace(
    "const [showMemberModal, setShowMemberModal] = useState(false);",
    "const [showMemberModal, setShowMemberModal] = useState(false);\n  const [showEditProfileModal, setShowEditProfileModal] = useState(false);"
  );
}

// Change the Editar click handler
// from: setShowMemberModal(true);
// to: setShowEditProfileModal(true);
// We will target the exact line 2368
const editClickHandlerOld = `                          setMemberFormData({ name: member.name, role: member.role, email: member.email, assignedProcesses: member.assignedProcesses || [], department: member.department || '', managerId: member.managerId || '' });
                          setMemberModalStep(1);
                          setShowMemberModal(true);`;

const editClickHandlerNew = `                          setMemberFormData({ name: member.name, role: member.role, email: member.email, assignedProcesses: member.assignedProcesses || [], department: member.department || '', managerId: member.managerId || '' });
                          setMemberModalStep(1);
                          setShowEditProfileModal(true);`;

if (content.includes(editClickHandlerOld)) {
  content = content.replace(editClickHandlerOld, editClickHandlerNew);
} else {
  // Try another regex if exact match fails
  content = content.replace(
    /onClick=\{\(\) => \{\n\s*modifiedTemplateIds = new Set\(\);\n\s*setEditingMember\(member\);\n\s*setMemberFormData\(\{.*?\}\);\n\s*setMemberModalStep\(1\);\n\s*setShowMemberModal\(true\);\n\s*\}\}/g,
    `onClick={() => {
                          modifiedTemplateIds = new Set();
                          setEditingMember(member);
                          setMemberFormData({ name: member.name, role: member.role, email: member.email, assignedProcesses: member.assignedProcesses || [], department: member.department || '', managerId: member.managerId || '' });
                          setMemberModalStep(1);
                          setShowEditProfileModal(true);
                        }}`
  );
}

fs.writeFileSync('src/App.jsx', content);
console.log('Injected Dialog imports and state to App.jsx');
