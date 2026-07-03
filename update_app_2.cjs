const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. External card: Show initials of involved people, delivery dates, and process type.
const cardHeaderStart = `<div className="process-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>`;
const cardHeaderEnd = `<h4 style={{ fontSize: '1rem', fontWeight: 'bold' }}>{inst.instanceName}</h4>`;
// We want to add the subtitle under the name.
const newCardTitle = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                              <h4 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>{inst.instanceName}</h4>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inst.category}</span>
                            </div>`;

content = content.replace(cardHeaderEnd, newCardTitle);

// Next, add the initials and dates to the card meta area
// Find the card meta area
const metaAreaSearch = `<div className="process-meta" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>`;

const newMetaArea = `
                        {/* Start and End Dates */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Inicio: {inst.steps[0]?.dueDate ? new Date(inst.steps[0].dueDate).toLocaleDateString() : 'N/A'}</span>
                          <span>Fin: {inst.steps[inst.steps.length - 1]?.dueDate ? new Date(inst.steps[inst.steps.length - 1].dueDate).toLocaleDateString() : 'N/A'}</span>
                        </div>

                        <div className="process-meta" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                            {inst.category}
                          </span>
                          {isOverdue && (
                            <span className="overdue-badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                              ⚠️ Demorado
                            </span>
                          )}
                          
                          {/* Involved team members initials */}
                          <div style={{ display: 'flex', marginLeft: 'auto' }}>
                            {Array.from(new Set(inst.steps.filter(s => s.assignedTo).map(s => s.assignedTo))).slice(0, 3).map((assigneeId, i) => {
                              const member = teamMembers.find(m => m.id === assigneeId);
                              if (!member) return null;
                              const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                              return (
                                <div key={assigneeId} title={member.name} style={{
                                  width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold',
                                  border: '2px solid white', marginLeft: i > 0 ? '-8px' : '0', zIndex: 10 - i
                                }}>
                                  {initials}
                                </div>
                              );
                            })}
                            {Array.from(new Set(inst.steps.filter(s => s.assignedTo).map(s => s.assignedTo))).length > 3 && (
                              <div style={{
                                width: '24px', height: '24px', borderRadius: '50%', background: '#e0e0e0', color: 'var(--text-main)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold',
                                border: '2px solid white', marginLeft: '-8px', zIndex: 0
                              }}>
                                +{Array.from(new Set(inst.steps.filter(s => s.assignedTo).map(s => s.assignedTo))).length - 3}
                              </div>
                            )}
                          </div>
`;

content = content.replace(metaAreaSearch, newMetaArea);


// 2. In the modal, add the process type as subtitle and show involved people
// Find the modal details header
const modalHeaderSearch = `                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)' }}>
                      {activeInstance.instanceName}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 400, marginTop: '4px' }}>
                      Plantilla base: {activeInstance.title} • Iniciado el {new Date(activeInstance.startedAt).toLocaleDateString()}
                    </p>`;

const newModalHeader = `                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {activeInstance.instanceName}
                    </h2>
                    <div style={{ fontSize: '1.1rem', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '8px' }}>
                      {activeInstance.category}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 400 }}>
                      Plantilla base: {activeInstance.title} • Iniciado el {new Date(activeInstance.startedAt).toLocaleDateString()}
                    </p>
                    
                    {/* Involved people list at the top of modal */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Involucrados:</span>
                      <div style={{ display: 'flex' }}>
                        {Array.from(new Set(activeInstance.steps.filter(s => s.assignedTo).map(s => s.assignedTo))).map((assigneeId, i) => {
                          const member = teamMembers.find(m => m.id === assigneeId);
                          if (!member) return null;
                          const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                          return (
                            <div key={assigneeId} title={member.name} style={{
                              width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold',
                              border: '2px solid white', marginLeft: i > 0 ? '-8px' : '0', zIndex: 10 - i
                            }}>
                              {initials}
                            </div>
                          );
                        })}
                        {Array.from(new Set(activeInstance.steps.filter(s => s.assignedTo).map(s => s.assignedTo))).length === 0 && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ninguno asignado aún</span>
                        )}
                      </div>
                    </div>`;

content = content.replace(modalHeaderSearch, newModalHeader);


fs.writeFileSync('src/App.jsx', content);
console.log('Done replacing app jsx');
