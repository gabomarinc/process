const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

if (!content.includes('expandedTeamTemplates')) {
  content = content.replace(
    'const [memberModalStep, setMemberModalStep] = useState(1);',
    'const [memberModalStep, setMemberModalStep] = useState(1);\n  const [expandedTeamTemplates, setExpandedTeamTemplates] = useState({});'
  );
}

const target = `                      {templates.map(temp => (
                        <div key={temp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary-hover)', marginBottom: '0.5rem' }}>{temp.title}</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {temp.steps.map((step, sIdx) => {`;

const repl = `                      {templates.map(temp => {
                        const isExpanded = expandedTeamTemplates[temp.id];
                        return (
                        <div key={temp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                          <div 
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem 0', userSelect: 'none' }}
                            onClick={() => setExpandedTeamTemplates(prev => ({ ...prev, [temp.id]: !prev[temp.id] }))}
                          >
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary-hover)', margin: 0 }}>{temp.title}</h4>
                            <span style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </span>
                          </div>
                          {isExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.75rem' }}>
                            {temp.steps.map((step, sIdx) => {`;

content = content.replace(target, repl);

const target2 = `                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}`;

const repl2 = `                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          )}
                        </div>
                      );})}`;
content = content.replace(target2, repl2);


fs.writeFileSync('src/App.jsx', content);
