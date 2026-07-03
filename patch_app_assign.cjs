const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add handleAssignStepMember
const handleAssignStr = `
  const handleAssignStepMember = async (instanceId, stepId, memberId) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) return;
    const updatedSteps = inst.steps.map(s => {
      if (s.id !== stepId) return s;
      return { ...s, assignedTo: memberId };
    });
    setInstances(prev => prev.map(i => i.id === instanceId ? { ...i, steps: updatedSteps } : i));
    try {
      await fetch(\`/api/instances/\${instanceId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: updatedSteps })
      });
    } catch (err) {
      console.error("Error al asignar responsable en Neon:", err);
    }
  };
`;

const insertIndex = content.indexOf('  const handleStepComplete = async');
if (insertIndex !== -1 && !content.includes('handleAssignStepMember = async')) {
  content = content.slice(0, insertIndex) + handleAssignStr + '\n' + content.slice(insertIndex);
}

// 2. Update rendering in Active Execution Modal
// Around line 2879 (as seen before):
const findStr = `                                  {step.assignedTo && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', background: '#f5f3f0', padding: '0.15rem 0.5rem', borderRadius: '20px', marginTop: '0.5rem', width: 'fit-content' }}>
                                      {(() => {
                                        const member = teamMembers.find(m => m.id === step.assignedTo);
                                        return member ? (
                                          <>
                                            <img src={member.avatar} alt={member.name} style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }} />
                                            <span>Responsable: <strong>{member.name}</strong></span>
                                          </>
                                        ) : <span>Asignado</span>;
                                      })()}
                                    </div>
                                  )}`;

const replaceStr = `                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', background: '#f5f3f0', padding: '0.15rem 0.5rem', borderRadius: '20px', marginTop: '0.5rem', width: 'fit-content' }}>
                                    <select
                                      value={step.assignedTo || ''}
                                      onChange={(e) => handleAssignStepMember(activeInstance.id, step.id, e.target.value)}
                                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 0' }}
                                    >
                                      <option value="">Sin Asignar</option>
                                      {teamMembers.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                      ))}
                                    </select>
                                    {step.assignedTo && teamMembers.find(m => m.id === step.assignedTo)?.avatar && (
                                      <img src={teamMembers.find(m => m.id === step.assignedTo).avatar} alt="avatar" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }} />
                                    )}
                                  </div>`;

if (content.includes(findStr)) {
  content = content.replace(findStr, replaceStr);
  fs.writeFileSync('src/App.jsx', content);
  console.log('App patched successfully');
} else {
  console.log('Could not find the target string to replace.');
}
