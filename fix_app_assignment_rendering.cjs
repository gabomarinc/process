const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Fix strict equality for assignedTo lookups
content = content.replace(/m => m\.id === step\.assignedTo/g, 'm => String(m.id) === String(step.assignedTo)');
content = content.replace(/m => m\.id === assigneeId/g, 'm => String(m.id) === String(assigneeId)');

// Insert dropdown in the full timeline (around line 2980)
// We will insert it just before the `step-action-area`
const timelineInsertTarget = `                                    {!isLocked && (
                                      <div className="step-action-area">`;

const timelineDropdownStr = `
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', background: '#f5f3f0', padding: '0.2rem 0.6rem', borderRadius: '20px', marginTop: '0.75rem', marginBottom: '0.75rem', width: 'fit-content' }}>
                                      <select
                                        value={step.assignedTo || ''}
                                        onChange={(e) => handleAssignStepMember(activeInstance.id, step.id, e.target.value)}
                                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', cursor: 'pointer', padding: '2px 0' }}
                                      >
                                        <option value="">Sin Asignar</option>
                                        {teamMembers.map(m => (
                                          <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                      </select>
                                      {step.assignedTo && teamMembers.find(m => String(m.id) === String(step.assignedTo))?.avatar && (
                                        <img src={teamMembers.find(m => String(m.id) === String(step.assignedTo)).avatar} alt="avatar" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                                      )}
                                    </div>

                                    {!isLocked && (
                                      <div className="step-action-area">`;

if (content.includes(timelineInsertTarget)) {
  content = content.replace(timelineInsertTarget, timelineDropdownStr);
}

fs.writeFileSync('src/App.jsx', content);
console.log('App patched to fix strict equality and add timeline dropdown');
