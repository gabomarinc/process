const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove the duplicate badges in the external card.
// We need to carefully remove the specific duplicate lines.
const duplicateBadges = `                          <span className="badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                            {inst.category}
                          </span>
                          {isOverdue && (
                            <span className="overdue-badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                              ⚠️ Demorado
                            </span>
                          )}`;

content = content.replace(duplicateBadges, '');


// 2. Add the base template name to the external card.
// Currently it is:
/*
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <h4 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>{inst.instanceName}</h4>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inst.category}</span>
                            </div>
*/
const cardTitleSearch = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                              <h4 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>{inst.instanceName}</h4>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inst.category}</span>
                            </div>`;

const newCardTitle = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                              <h4 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>{inst.instanceName}</h4>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inst.category}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Plantilla: {inst.title}</span>
                            </div>`;

content = content.replace(cardTitleSearch, newCardTitle);


fs.writeFileSync('src/App.jsx', content);
console.log('Fixed duplicates and added template title');
