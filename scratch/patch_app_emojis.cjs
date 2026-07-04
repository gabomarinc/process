const fs = require('fs');

function replaceAll(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  for (const [a, b] of replacements) {
    content = content.split(a).join(b);
  }
  fs.writeFileSync(file, content, 'utf8');
}

// App.jsx
replaceAll('src/App.jsx', [
  ["['🏢', '🚀', '🌐', '💻', '📈', '🤝', '🛠️', '💎']", "[<Building size={18}/>, <Rocket size={18}/>, <Globe size={18}/>, <Laptop size={18}/>, <TrendingUp size={18}/>, <Handshake size={18}/>, <Wrench size={18}/>, <Gem size={18}/>]"],
  ['companionAvatar: "🐰"', 'companionAvatar: <Bot size={24} />'],
  ["`⚠️ RETRASO:", "`RETRASO:"],
  ["Todo el equipo está al día. 🎉`", "Todo el equipo está al día.`"],
  ["`¡Increíble logro! 🎉", "`¡Increíble logro!"],
  ["¡Confío plenamente en ti! 🧡`", "¡Confío plenamente en ti!`"],
  ["🚀 Nueva Ejecución", "<Rocket size={18} style={{marginRight:'4px'}} /> Nueva Ejecución"],
  ["<div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>", "<div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-primary)' }}><Rocket size={64} /></div>"],
  ["🚀 Iniciar Primera Ejecución", "<Rocket size={18} style={{marginRight:'4px'}} /> Iniciar Primera Ejecución"],
  ["🤖 {temp.companionName", "<Bot size={14} style={{marginRight:'4px', display:'inline-block'}}/> {temp.companionName"],
  [">🗑️<", "><Trash2 size={18} /><"],
  ["➕ Agregar Personal", "<Plus size={18} style={{marginRight:'4px', display:'inline-block'}}/> Agregar Personal"],
  ["📧 {member.email}", "<Mail size={16} style={{marginRight:'4px', display:'inline-block'}}/> {member.email}"],
  ["🏢 <strong>Área:</strong>", "<Building size={16} style={{marginRight:'4px', display:'inline-block'}}/> <strong>Área:</strong>"],
  ["👤 <strong>Jefe Directo:</strong>", "<User size={16} style={{marginRight:'4px', display:'inline-block'}}/> <strong>Jefe Directo:</strong>"],
  ["⚙️ Configuración del Sistema", "<Settings size={20} style={{marginRight:'4px', display:'inline-block'}}/> Configuración del Sistema"],
  ['placeholder="Ej. 🤖"', 'placeholder="Ej. Avatar URL"'],
  ["➕ Invitar / Registrar Usuario", "<Plus size={18} style={{marginRight:'4px', display:'inline-block'}}/> Invitar / Registrar Usuario"],
  ['<div className="celebration-emoji">🎉✨🏆</div>', '<div className="celebration-emoji" style={{ display: "flex", justifyContent: "center", gap: "1rem", color: "var(--color-primary)" }}><PartyPopper size={64}/><Sparkles size={64}/><Trophy size={64}/></div>']
]);

console.log("App.jsx patched.");
