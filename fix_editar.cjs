const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const target = `                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                          setEditingMember(member);`;
                          
const replacement = `                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                          modifiedTemplateIds = new Set();
                          setEditingMember(member);`;

content = content.replace(target, replacement);

const target2 = `  const [showMemberModal, setShowMemberModal] = useState(false);`;
const replacement2 = `  const [showMemberModal, setShowMemberModal] = useState(false);
  const handleOpenNewMember = () => {
    modifiedTemplateIds = new Set();
    setEditingMember(null);
    setMemberFormData({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '' });
    setMemberModalStep(1);
    setShowMemberModal(true);
  };`;
content = content.replace(target2, replacement2);

fs.writeFileSync('src/App.jsx', content);
