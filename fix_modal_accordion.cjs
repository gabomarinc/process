const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const targetOld = `{templates.map(temp => (
                    <div key={temp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary-hover)', marginBottom: '0.5rem' }}>{temp.title}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {temp.steps.map((step, sIdx) => {`;

const targetNew = `{templates.map(temp => {
                    const isExpanded = expandedTemplates[temp.id];
                    return (
                    <div key={temp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                      <div 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem 0' }}
                        onClick={() => setExpandedTemplates(prev => ({ ...prev, [temp.id]: !prev[temp.id] }))}
                      >
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary-hover)', margin: 0 }}>{temp.title}</h4>
                        <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                      </div>
                      
                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                          {temp.steps.map((step, sIdx) => {`;

content = content.replace(targetOld, targetNew);

// Since we opened a `{isExpanded && (` block, we need to close it.
// The end of the inner map is:
//                             </div>
//                           );
//                         })}
//                       </div>
//                     </div>
//                   ))}

const endTargetOld = `                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>`;

const endTargetNew = `                          );
                        })}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>`;

content = content.replace(endTargetOld, endTargetNew);

fs.writeFileSync('src/App.jsx', content);
console.log('Accordion fixed');
