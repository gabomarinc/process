import React from 'react';
import { X, Check, Edit, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MemberModal = ({
  isOpen,
  onClose,
  step,
  setStep,
  editingMember,
  formData,
  setFormData,
  handleSave,
  teamMembers,
  orgUsers,
  templates,
  expandedTeamTemplates,
  setExpandedTeamTemplates,
  modifiedTemplateIds,
  setTemplates,
  showAlert
}) => {
  if (!isOpen) return null;

  const handleNextStep = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name || !formData.email) {
        showAlert("Por favor completa los campos obligatorios del Paso 1.");
        return;
      }
    } else if (step === 2) {
      if (!formData.role || !formData.department) {
        showAlert("Por favor completa los campos obligatorios del Paso 2.");
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const stepsList = [
    { label: "Información" },
    { label: "Profesional" },
    { label: "Asignación" }
  ];

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <motion.div
        className="custom-wizard-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
        </div>

        {/* Stepper Progress */}
        <div className="custom-wizard-stepper">
          {stepsList.map((s, idx) => {
            const isCompleted = idx + 1 < step;
            const isActive = idx + 1 === step;
            return (
              <div key={idx} className={`custom-wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="custom-wizard-step-dot">
                  {isCompleted ? <Check size={16}/> : idx + 1}
                </div>
                <span className="custom-wizard-step-label">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="custom-wizard-header">
          <h2 className="custom-wizard-title">
            {editingMember ? <><Edit size={20} className="inline-block mr-2"/> Editar Colaborador</> : <><Users size={20} className="inline-block mr-2"/> Nuevo Colaborador</>}
          </h2>
          <p className="custom-wizard-description">
            {step === 1 && "Comencemos con los datos básicos de contacto del colaborador."}
            {step === 2 && "Define el rol, departamento y línea de reporte en la organización."}
            {step === 3 && "Selecciona los pasos del proceso en los que intervendrá."}
          </p>
        </div>

        <form onSubmit={step < 3 ? handleNextStep : handleSave} className="custom-wizard-form">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="custom-wizard-label">Nombre Completo *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    autoFocus
                    placeholder="Ej. Ana Pérez"
                    className="custom-wizard-input"
                  />
                </div>
                <div>
                  <label className="custom-wizard-label">Correo Electrónico *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="ana@empresa.com"
                    className="custom-wizard-input"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="custom-wizard-label">Cargo / Rol *</label>
                  <input
                    type="text"
                    placeholder="Ej. Diseñadora de UI, Director de Operaciones"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                    autoFocus
                    className="custom-wizard-input"
                  />
                </div>
                <div>
                  <label className="custom-wizard-label">Departamento / Área *</label>
                  <input
                    type="text"
                    placeholder="Ej. Operaciones, Tecnología, Finanzas"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    className="custom-wizard-input"
                  />
                </div>
                <div>
                  <label className="custom-wizard-label">Jefe Directo (Opcional)</label>
                  <select
                    value={formData.managerId || "none"}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value === "none" ? "" : e.target.value })}
                    className="custom-wizard-input"
                  >
                    <option value="none">-- Sin jefe directo --</option>
                    {teamMembers
                      .filter(m => !editingMember || m.id !== editingMember.id)
                      .map(m => (
                        <option key={m.id} value={String(m.id)}>{m.name} ({m.role})</option>
                      ))
                    }
                    {orgUsers
                      .filter(u => !teamMembers.some(m => m.email === u.email))
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'Administrador' : u.role === 'gerente' ? 'Gerente' : 'Agente'})</option>
                      ))
                    }
                  </select>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '12px', background: '#f9fafb' }}>
                  {templates.map(temp => {
                    const isExpanded = expandedTeamTemplates[temp.id];
                    return (
                      <div key={temp.id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.25rem 0', userSelect: 'none' }}
                          onClick={() => setExpandedTeamTemplates(prev => ({ ...prev, [temp.id]: !prev[temp.id] }))}
                        >
                          <h4 style={{ fontWeight: 700, color: 'var(--color-primary)', margin: 0, fontSize: '0.9rem' }}>{temp.title}</h4>
                          <span style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </span>
                        </div>
                        {isExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.5rem' }}>
                            {(temp.steps || []).filter(Boolean).map((step, sIdx) => {
                              const isStepAssigned = String(step.assignedTo) === String(editingMember?.id || 'temp_new_member');
                              return (
                                <div key={sIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                  <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>
                                    <strong style={{ color: 'var(--color-primary)', marginRight: '4px' }}>Paso {sIdx + 1}</strong>
                                    {step.title}
                                  </span>
                                  <div style={{ display: 'inline-flex', borderRadius: '99px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        modifiedTemplateIds.add(temp.id);
                                        setTemplates(prev => prev.map(t => {
                                          if (t.id !== temp.id) return t;
                                          const updatedSteps = [...(t.steps || [])].filter(Boolean);
                                          if (updatedSteps[sIdx]) {
                                            updatedSteps[sIdx] = { ...updatedSteps[sIdx], assignedTo: editingMember?.id || 'temp_new_member' };
                                          }
                                          return { ...t, steps: updatedSteps };
                                        }));
                                        if (!formData.assignedProcesses.includes(temp.id)) {
                                          setFormData(prev => ({
                                            ...prev,
                                            assignedProcesses: [...prev.assignedProcesses, temp.id]
                                          }));
                                        }
                                      }}
                                      style={{
                                        border: 'none',
                                        padding: '4px 10px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        background: isStepAssigned ? 'var(--color-primary)' : '#f3f4f6',
                                        color: isStepAssigned ? 'white' : '#6b7280'
                                      }}
                                    >Sí</button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        modifiedTemplateIds.add(temp.id);
                                        setTemplates(prev => prev.map(t => {
                                          if (t.id !== temp.id) return t;
                                          const updatedSteps = [...(t.steps || [])].filter(Boolean);
                                          if (updatedSteps[sIdx] && String(updatedSteps[sIdx].assignedTo) === String(editingMember?.id || 'temp_new_member')) {
                                            updatedSteps[sIdx] = { ...updatedSteps[sIdx], assignedTo: '' };
                                          }
                                          return { ...t, steps: updatedSteps };
                                        }));
                                      }}
                                      style={{
                                        border: 'none',
                                        padding: '4px 10px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        background: !isStepAssigned ? '#ef4444' : '#f3f4f6',
                                        color: !isStepAssigned ? 'white' : '#6b7280'
                                      }}
                                    >No</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {templates.length === 0 && (
                    <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>
                      No hay plantillas de procesos disponibles.
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer controls */}
          <div className="custom-wizard-footer">
            <button
              type="button"
              className="custom-wizard-btn-back"
              onClick={() => {
                if (step > 1) {
                  setStep(prev => prev - 1);
                } else {
                  onClose();
                }
              }}
            >
              {step > 1 ? 'Atrás' : 'Cancelar'}
            </button>
            <button type="submit" className="custom-wizard-btn-next">
              {step === 3 ? 'Guardar' : 'Siguiente'}
            </button>
          </div>
          <div className="custom-wizard-step-info">
            Paso {step} de 3
          </div>
        </form>
      </motion.div>
    </div>
  );
};
