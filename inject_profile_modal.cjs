const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const profileModalComponent = `
      {/* Edit Profile Modal */}
      <Dialog open={showEditProfileModal} onOpenChange={(open) => {
        if (!open) {
          setShowEditProfileModal(false);
          setEditingMember(null);
        }
      }}>
        <DialogContent style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: 0, width: '100%', maxWidth: '32rem', maxHeight: '90vh' }}>
          <DialogHeader style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          
          <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Nombre Completo</label>
                  <input
                    className="form-input"
                    placeholder="Ej. Ana Pérez"
                    value={memberFormData.name}
                    onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Puesto / Rol</label>
                    <input
                      className="form-input"
                      placeholder="Ej. Líder de Compras"
                      value={memberFormData.role}
                      onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="ana@empresa.com"
                      value={memberFormData.email}
                      onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Área / Departamento</label>
                    <input
                      className="form-input"
                      placeholder="Ej. Operaciones"
                      value={memberFormData.department || ''}
                      onChange={(e) => setMemberFormData({ ...memberFormData, department: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Jefe Directo (Opcional)</label>
                    <select
                      className="form-input"
                      value={memberFormData.managerId || ''}
                      onChange={(e) => setMemberFormData({ ...memberFormData, managerId: e.target.value })}
                    >
                      <option value="">-- Sin jefe --</option>
                      {teamMembers
                        .filter(m => !editingMember || m.id !== editingMember.id)
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))
                      }
                      {orgUsers
                        .filter(u => !teamMembers.some(m => m.email === u.email))
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </div>

              {/* Asignación de Pasos section included below profile fields */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                <label style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Asignación de Pasos en Procesos</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Activa o desactiva los pasos específicos en los que participará este colaborador.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.08)', padding: '15px', borderRadius: '12px', backgroundColor: '#fdfbfa' }}>
                  {templates.map(temp => (
                    <div key={temp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary-hover)', marginBottom: '0.5rem' }}>{temp.title}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {temp.steps.map((step, sIdx) => {
                          const isStepAssigned = String(step.assignedTo) === String(editingMember?.id || 'temp_new_member');
                          
                          return (
                            <div key={sIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)' }}>
                              <span style={{ fontSize: '0.85rem' }}>
                                <strong style={{ color: 'var(--color-primary)', marginRight: '6px' }}>Paso {sIdx + 1}</strong>
                                {step.title}
                              </span>
                              <div style={{ display: 'inline-flex', borderRadius: '99px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    modifiedTemplateIds.add(temp.id);
                                    setTemplates(prev => prev.map(t => {
                                      if (t.id !== temp.id) return t;
                                      const updatedSteps = [...t.steps];
                                      updatedSteps[sIdx] = { ...updatedSteps[sIdx], assignedTo: editingMember?.id || 'temp_new_member' };
                                      return { ...t, steps: updatedSteps };
                                    }));
                                  }}
                                  style={{
                                    border: 'none',
                                    padding: '4px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    backgroundColor: isStepAssigned ? 'var(--color-primary)' : '#f3f4f6',
                                    color: isStepAssigned ? 'white' : '#6b7280',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  SÍ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    modifiedTemplateIds.add(temp.id);
                                    setTemplates(prev => prev.map(t => {
                                      if (t.id !== temp.id) return t;
                                      const updatedSteps = [...t.steps];
                                      if (String(updatedSteps[sIdx].assignedTo) === String(editingMember?.id || 'temp_new_member')) {
                                        updatedSteps[sIdx] = { ...updatedSteps[sIdx], assignedTo: '' };
                                      }
                                      return { ...t, steps: updatedSteps };
                                    }));
                                  }}
                                  style={{
                                    border: 'none',
                                    padding: '4px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    backgroundColor: !isStepAssigned ? '#ef4444' : '#f3f4f6',
                                    color: !isStepAssigned ? 'white' : '#6b7280',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  NO
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
          
          <DialogFooter style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', backgroundColor: '#fafafa' }}>
            <DialogClose asChild>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                Cancelar
              </button>
            </DialogClose>
            <button 
              className="btn btn-primary" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              onClick={(e) => {
                e.preventDefault();
                handleSaveMember(e);
                setShowEditProfileModal(false);
              }}
            >
              Guardar Cambios
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

// Insert the new modal before the existing showMemberModal
if (content.includes('{showMemberModal && (')) {
  content = content.replace('{showMemberModal && (', profileModalComponent + '\n      {showMemberModal && (');
}

fs.writeFileSync('src/App.jsx', content);
console.log('Injected Edit Profile modal');
