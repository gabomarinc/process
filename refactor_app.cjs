const fs = require('fs');

const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

// We need to extract the `activeInstance` details block
const detailsStartStr = `          {activeTab === 'instances' ? (
            activeInstance ? (
              <div className="achievement-card-unified">`;
const detailsEndStr = `                })()}
              </div>
            ) : (`;

const detailsStartIndex = content.indexOf(detailsStartStr);
if (detailsStartIndex === -1) {
  console.log("Details start not found");
  process.exit(1);
}

const detailsEndIndex = content.indexOf(detailsEndStr, detailsStartIndex);
if (detailsEndIndex === -1) {
  console.log("Details end not found");
  process.exit(1);
}

// Extract the achievement-card-unified block
const achievementCardContent = content.substring(detailsStartIndex + detailsStartStr.indexOf('<div className="achievement-card-unified">'), detailsEndIndex + `                })()}
              </div>`.length);

// Extract the "No hay ejecuciones activas" block
const noExecStartStr = `            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>`;
const noExecEndStr = `                </button>
              </div>
            )
          ) : activeTab === 'templates' ? (`;

const noExecStartIndex = content.indexOf(noExecStartStr, detailsEndIndex);
const noExecEndIndex = content.indexOf(noExecEndStr, noExecStartIndex);
const noExecContent = content.substring(noExecStartIndex + 18, noExecEndIndex + `                </button>
              </div>`.length);


// We need to extract the "Ejecuciones Activas" list block from the Right Side
const listStartStr = `              {activeTab === 'instances' ? (
                <div>
                  <h3 className="section-title">Ejecuciones Activas</h3>
                  <div className="process-list">`;
const listEndStr = `                  </div>
                </div>
              ) : activeTab === 'templates' ? (`;

const listStartIndex = content.indexOf(listStartStr);
const listEndIndex = content.indexOf(listEndStr, listStartIndex);

const listContent = content.substring(listStartIndex + listStartStr.indexOf('<div>'), listEndIndex + `                  </div>
                </div>`.length);


// Now, build the replacement for the Left Side
const newLeftSide = `          {activeTab === 'instances' ? (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)' }}>Ejecuciones Activas</h2>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  onClick={() => {
                    setLaunchInstanceName('');
                    setLaunchStartDate(new Date().toISOString().split('T')[0]);
                    setLaunchTemplateId('');
                    setShowLaunchModal(true);
                  }}
                >
                  🚀 Nueva Ejecución
                </button>
              </div>
              {instances.length === 0 ? (
${noExecContent}
              ) : (
                <div className="process-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {instances.map(inst => {
                    const total = inst.steps.length;
                    const completed = inst.steps.filter(s => s.isCompleted).length;
                    const percentage = Math.round((completed / total) * 100) || 0;
                    const isOverdue = checkOverdueSteps(inst);

                    return (
                      <div 
                        key={inst.id}
                        className={\`process-card \${inst.id === selectedInstanceId ? 'active' : ''}\`}
                        onClick={() => setSelectedInstanceId(inst.id)}
                        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer' }}
                      >
                        <div className="process-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 'bold' }}>{inst.instanceName}</h4>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.1rem' }}>{inst.companionAvatar}</span>
                            <button 
                              onClick={(e) => deleteInstance(inst.id, e)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="process-meta" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                            {inst.category}
                          </span>
                          {isOverdue && (
                            <span className="overdue-badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                              ⚠️ Demorado
                            </span>
                          )}
                        </div>

                        <div className="process-progress-container">
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: \`\${percentage}%\` }} />
                          </div>
                          <span className="progress-percent">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'templates' ? (`

// We need to replace the entire Left Side block (from activeTab === 'instances' ? ( activeInstance ? ... down to activeTab === 'templates')
const leftSideEndIndex = noExecEndIndex + noExecEndStr.length;
content = content.substring(0, detailsStartIndex) + newLeftSide + content.substring(leftSideEndIndex);

// We need to remove the list block from the Right Side and make it empty or something else
// Wait, if we remove it, we need to leave the other conditions in the ternary.
const rightSideRepl = `              {activeTab === 'instances' ? (
                <div style={{ display: 'none' }}></div>
              ) : activeTab === 'templates' ? (`;

const newListStartIndex = content.indexOf(listStartStr);
const newListEndIndex = content.indexOf(listEndStr, newListStartIndex);
content = content.substring(0, newListStartIndex) + rightSideRepl + content.substring(newListEndIndex + listEndStr.length);

// Finally, add the Modal at the bottom before the last </div>

// We need to find the `showLaunchModal` and add our new modal right above it.
const modalInsertionStr = `      {/* Start Execution Modal */}`;
const modalInsertionIndex = content.indexOf(modalInsertionStr);

const newModal = `      {/* Active Execution Modal */}
      {selectedInstanceId && activeInstance && (
        <div className="modal-overlay" onClick={() => setSelectedInstanceId(null)}>
          <div className="modal-card" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'sticky', top: 0, right: 0, display: 'flex', justifyContent: 'flex-end', padding: '1rem', background: 'var(--bg-main)', zIndex: 10, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
               <button onClick={() => setSelectedInstanceId(null)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>Cerrar</button>
            </div>
            <div style={{ padding: '0 2rem 2rem 2rem' }}>
${achievementCardContent}
            </div>
          </div>
        </div>
      )}

`;

content = content.substring(0, modalInsertionIndex) + newModal + content.substring(modalInsertionIndex);

// Wait, X icon is not imported. I'll use "Cerrar" button or standard html entity. I used Cerrar button.

fs.writeFileSync(appPath, content);
console.log("Refactoring complete");
