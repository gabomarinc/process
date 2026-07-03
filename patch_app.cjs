const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add state for expanded members in template detail
if (!content.includes('const [expandedTemplateMembers')) {
  content = content.replace(
    'const [expandedTeamTemplates, setExpandedTeamTemplates] = useState({});',
    'const [expandedTeamTemplates, setExpandedTeamTemplates] = useState({});\n  const [expandedTemplateMembers, setExpandedTemplateMembers] = useState({});'
  );
}

// 2. Make steps collapsible
const targetCollapse = `                                  {/* Step Toggles */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                                    {activeTemplate.steps.map((step, sIdx) => {`;
const replCollapse = `                                  {/* Step Toggles */}
                                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                    <button 
                                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                      onClick={() => setExpandedTemplateMembers(prev => ({ ...prev, [member.id]: !prev[member.id] }))}
                                    >
                                      {expandedTemplateMembers[member.id] ? 'Ocultar pasos' : 'Ver y asignar pasos'}
                                      <span style={{ transition: 'transform 0.2s', transform: expandedTemplateMembers[member.id] ? 'rotate(180deg)' : 'rotate(0)' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                      </span>
                                    </button>
                                  </div>
                                  {expandedTemplateMembers[member.id] && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                                    {activeTemplate.steps.map((step, sIdx) => {`;
content = content.replace(targetCollapse, replCollapse);

const targetCollapseEnd = `                                        </div>
                                      );
                                    })}
                                  </div>`;
const replCollapseEnd = `                                        </div>
                                      );
                                    })}
                                  </div>
                                  )}`;
content = content.replace(targetCollapseEnd, replCollapseEnd);

// 3. Update confirm button behavior
const targetConfirm = `                                      await saveTemplate({ ...activeTemplate, steps: newSteps });
                                    }}
                                  >
                                    ✅ Confirmar asignación de {member.name}
                                  </button>`;
const replConfirm = `                                      await saveTemplate({ ...activeTemplate, steps: newSteps });
                                      setActiveTemplate(null);
                                      setTicketModal({
                                        isOpen: true,
                                        title: "¡Asignación Guardada!",
                                        message: \`Se actualizaron los pasos de \${member.name} en la plantilla.\`,
                                        ticketId: member.id,
                                        customFields: [
                                          { label: "Colaborador", value: member.name },
                                          { label: "Plantilla", value: activeTemplate.title }
                                        ]
                                      });
                                    }}
                                  >
                                    ✅ Confirmar asignación de {member.name}
                                  </button>`;
content = content.replace(targetConfirm, replConfirm);

fs.writeFileSync('src/App.jsx', content);
