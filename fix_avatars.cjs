const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Line 2116 replacement (18px)
const target1 = `<img src={member.avatar} alt={member.name} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />`;
const repl1 = `<div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>{member.name ? member.name.charAt(0).toUpperCase() : 'U'}</div>`;
content = content.replace(target1, repl1);

// Line 2169 replacement (40px)
const target2 = /<img\s*src=\{member\.avatar\}\s*alt=\{member\.name\}\s*style=\{\{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba\(var\(--color-primary-rgb\),0\.2\)' \}\}\s*\/>/;
const repl2 = `<div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', border: '2px solid rgba(var(--color-primary-rgb),0.2)' }}>{member.name ? member.name.charAt(0).toUpperCase() : 'U'}</div>`;
content = content.replace(target2, repl2);

// Line 2937 & 3019 replacement (14px and optional chaining)
// Instead of optional chaining we just replace the whole block
const target3 = `                                    {step.assignedTo && teamMembers.find(m => String(m.id) === String(step.assignedTo))?.avatar && (
                                      <img src={teamMembers.find(m => String(m.id) === String(step.assignedTo)).avatar} alt="avatar" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }} />
                                    )}`;
const repl3 = `                                    {step.assignedTo && teamMembers.find(m => String(m.id) === String(step.assignedTo)) && (
                                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold' }}>{teamMembers.find(m => String(m.id) === String(step.assignedTo)).name.charAt(0).toUpperCase()}</div>
                                    )}`;
content = content.replace(target3, repl3);
content = content.replace(target3, repl3);

// And another one at 3019 might have 16px instead of 14px in original codebase?
const target4 = `                                      {step.assignedTo && teamMembers.find(m => String(m.id) === String(step.assignedTo))?.avatar && (
                                        <img src={teamMembers.find(m => String(m.id) === String(step.assignedTo)).avatar} alt="avatar" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                                      )}`;
const repl4 = `                                      {step.assignedTo && teamMembers.find(m => String(m.id) === String(step.assignedTo)) && (
                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>{teamMembers.find(m => String(m.id) === String(step.assignedTo)).name.charAt(0).toUpperCase()}</div>
                                      )}`;
content = content.replace(target4, repl4);
content = content.replace(target4, repl4);

fs.writeFileSync('src/App.jsx', content);
