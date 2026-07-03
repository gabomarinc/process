const fs = require('fs');

let app = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Template Details Modal
app = app.replace(
  '<button className="back-btn" onClick={() => setSelectedTemplateId("")}>\\n                        ← Cerrar Detalles\\n                      </button>',
  '<div></div>\\n                      <button className="close-btn-aesthetic" onClick={() => setSelectedTemplateId("")} title="Cerrar"><X size={20} /></button>'
);

// 2. Active Execution Details Modal
app = app.replace(
  '<div style={{ position: \\'sticky\\', top: 0, right: 0, display: \\'flex\\', justifyContent: \\'space-between\\', alignItems: \\'center\\', padding: \\'1rem 1.5rem\\', background: \\'rgba(255, 255, 255, 0.9)\\', backdropFilter: \\'blur(8px)\\', zIndex: 10, borderBottom: \\'1px solid rgba(0,0,0,0.05)\\' }}>\\n               <span style={{ fontWeight: 600, color: \\'var(--text-muted)\\' }}>Detalles de la Ejecución</span>\\n               <button className="back-btn" onClick={() => setSelectedInstanceId(null)} style={{ border: \\'none\\', padding: \\'4px 8px\\' }}>\\n                 Cerrar ✕\\n               </button>',
  '<div style={{ position: \\'sticky\\', top: 0, right: 0, display: \\'flex\\', justifyContent: \\'space-between\\', alignItems: \\'center\\', padding: \\'1rem 1.5rem\\', background: \\'rgba(255, 255, 255, 0.9)\\', backdropFilter: \\'blur(8px)\\', zIndex: 10, borderBottom: \\'1px solid rgba(0,0,0,0.05)\\' }}>\\n               <span style={{ fontWeight: 600, color: \\'var(--text-main)\\' }}>Detalles de la Ejecución</span>\\n               <button className="close-btn-aesthetic" onClick={() => setSelectedInstanceId(null)} title="Cerrar"><X size={20} /></button>'
);

// 3. Member Modal
const memberModalHeader = \`<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-color)', margin: 0 }}>
                {editingMember ? '📝 Editar Colaborador' : '👥 Nuevo Colaborador'}
              </h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(26, 115, 232, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '50px' }}>
                Paso {memberModalStep} de 3
              </span>
            </div>\`;

const newMemberModalHeader = \`<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', position: 'relative' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-color)', margin: 0 }}>
                  {editingMember ? '📝 Editar Colaborador' : '👥 Nuevo Colaborador'}
                </h3>
                <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(26, 115, 232, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '50px' }}>
                  Paso {memberModalStep} de 3
                </span>
              </div>
              <button className="close-btn-aesthetic" onClick={() => { setShowMemberModal(false); setMemberModalStep(1); setEditingMember(null); }} title="Cerrar"><X size={20} /></button>
            </div>\`;

app = app.replace(memberModalHeader, newMemberModalHeader);

// 4. Add User Modal
const addUserModalHeader = \`<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-color)', margin: 0 }}>
                👤 Registrar Nuevo Usuario
              </h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(26, 115, 232, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '50px' }}>
                Paso {addUserModalStep} de 2
              </span>
            </div>\`;

const newAddUserModalHeader = \`<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', position: 'relative' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-color)', margin: 0 }}>
                  👤 Registrar Nuevo Usuario
                </h3>
                <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(26, 115, 232, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '50px' }}>
                  Paso {addUserModalStep} de 2
                </span>
              </div>
              <button type="button" className="close-btn-aesthetic" onClick={() => { setShowAddUserModal(false); setAddUserModalStep(1); }} title="Cerrar"><X size={20} /></button>
            </div>\`;

app = app.replace(addUserModalHeader, newAddUserModalHeader);

fs.writeFileSync('src/App.jsx', app);
console.log('App.jsx modals patched.');
