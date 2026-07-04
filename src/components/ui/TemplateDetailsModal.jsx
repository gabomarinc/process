import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Rocket, Trash2, Edit2, Plus, Users, ListChecks } from 'lucide-react';
import { cn } from '../../lib/utils';
import './TemplateDetailsModal.css';

export const TemplateDetailsModal = ({
  isOpen,
  onClose,
  activeTemplate,
  onLaunch,
  onDelete,
  saveTemplate,
  teamMembers,
  detailModalTab,
  setDetailModalTab,
  draftAssignment,
  setDraftAssignment,
  editingStepIndex,
  setEditingStepIndex,
  editingStepData,
  setEditingStepData,
  handleUpdateStep,
  handleDeleteStep,
  handleAddStep,
  expandedTemplateMembers,
  setExpandedTemplateMembers,
  setTicketModal
}) => {
  useEffect(() => {
    if (activeTemplate && activeTemplate.steps && teamMembers) {
      const initial = {};
      teamMembers.forEach(m => {
        initial[m.id] = (activeTemplate.steps || [])
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => s && String(s.assignedTo) === String(m.id))
          .map(({ i }) => i);
      });
      setDraftAssignment(initial);
    }
  }, [activeTemplate, teamMembers, setDraftAssignment]);

  if (!isOpen || !activeTemplate) return null;

  const stepsList = (activeTemplate.steps || []).filter(Boolean);

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <motion.div
        className="w-full max-w-4xl mx-auto py-8 px-4"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
        </div>

        <div className="tdm-modal-card">
          {/* Header */}
          <div className="tdm-header">
            <div style={{ flex: 1 }}>
              <div className="tdm-header-info">
                <span className="tdm-header-avatar">{activeTemplate.companionAvatar || <Settings size={24}/>}</span>
                <div>
                  <h2 className="tdm-header-title">{activeTemplate.title}</h2>
                  <p className="tdm-header-desc">{activeTemplate.description}</p>
                </div>
              </div>
              <div className="tdm-meta-row">
                <span className="tdm-meta-badge primary">
                  Guía: {activeTemplate.companionName}
                </span>
                <span className="tdm-meta-badge secondary">
                  Duración: {activeTemplate.durationDays} días
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Categoría:</span>
                  <input 
                    type="text"
                    value={activeTemplate.category || ''} 
                    onChange={(e) => saveTemplate({ ...activeTemplate, category: e.target.value })} 
                    className="tdm-category-input"
                  />
                </div>
              </div>
            </div>
            
            <div className="tdm-header-actions">
              <button onClick={onLaunch} className="tdm-btn-launch">
                <Rocket size={16} /> Iniciar Ejecución
              </button>
              <button onClick={() => onDelete(activeTemplate.id)} className="tdm-btn-delete">
                <Trash2 size={16} /> Eliminar Plantilla
              </button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="tdm-tabs-container">
            <button 
              className={`tdm-tab-trigger ${detailModalTab === 'steps' ? 'active' : ''}`}
              onClick={() => setDetailModalTab('steps')}
            >
              <ListChecks size={18} /> Pasos del Proceso
            </button>
            <button 
              className={`tdm-tab-trigger ${detailModalTab === 'team' ? 'active' : ''}`}
              onClick={() => {
                setDetailModalTab('team');
                const initial = {};
                teamMembers.forEach(m => {
                  initial[m.id] = activeTemplate.steps
                    .map((s, i) => ({ s, i }))
                    .filter(({ s }) => String(s.assignedTo) === String(m.id))
                    .map(({ i }) => i);
                });
                setDraftAssignment(initial);
              }}
            >
              <Users size={18} /> Asignación del Equipo
            </button>
          </div>

          {/* Modal Tab Content */}
          <div className="tdm-content">
            {detailModalTab === 'steps' ? (
              <div className="tdm-steps-list">
                {stepsList.map((step, idx) => {
                  const isEditing = editingStepIndex === idx;

                  return (
                    <div key={idx} className="tdm-step-card-wrapper">
                      <div className="tdm-step-number">
                        {idx + 1}
                      </div>
                      
                      <div className="tdm-step-card">
                        {isEditing ? (
                          <div className="tdm-step-edit-form">
                            <div className="tdm-form-row">
                              <div className="tdm-form-group">
                                <label>Título del Paso</label>
                                <input 
                                  type="text"
                                  value={editingStepData.title}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, title: e.target.value })}
                                />
                              </div>
                              <div className="tdm-form-group">
                                <label>Día relativo</label>
                                <input 
                                  type="number" 
                                  value={editingStepData.relativeOffsetDays}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, relativeOffsetDays: parseInt(e.target.value) || 1 })}
                                  min="1"
                                />
                              </div>
                            </div>

                            <div className="tdm-form-group">
                              <label>Descripción del paso</label>
                              <textarea 
                                rows={3}
                                value={editingStepData.description}
                                onChange={(e) => setEditingStepData({ ...editingStepData, description: e.target.value })}
                              />
                            </div>

                            <div className="tdm-form-row">
                              <div className="tdm-form-group">
                                <label>Tipo de Acción</label>
                                <select 
                                  value={editingStepData.type}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, type: e.target.value })}
                                >
                                  <option value="manual">Paso Manual (Checkbox)</option>
                                  <option value="digital">Acción Digital (Archivo)</option>
                                </select>
                              </div>
                              <div className="tdm-form-group">
                                <label>Mensaje Motivador</label>
                                <input 
                                  type="text"
                                  value={editingStepData.motivation}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, motivation: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="tdm-form-group">
                              <label>Responsable Asignado</label>
                              <select
                                value={editingStepData.assignedTo || 'none'}
                                onChange={(e) => setEditingStepData({ ...editingStepData, assignedTo: e.target.value === 'none' ? '' : e.target.value })}
                              >
                                <option value="none">-- Sin asignar (Nadie) --</option>
                                {teamMembers.map(m => (
                                  <option key={m.id} value={String(m.id)}>
                                    {m.name} ({m.role})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="tdm-form-actions">
                              <button className="tdm-btn-cancel-step" onClick={() => setEditingStepIndex(null)}>
                                Cancelar
                              </button>
                              <button 
                                className="tdm-btn-save-step"
                                onClick={() => {
                                  handleUpdateStep(activeTemplate.id, idx, editingStepData);
                                  setEditingStepIndex(null);
                                }}
                              >
                                Guardar Paso
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="tdm-step-header">
                              <div>
                                <h4 className="tdm-step-title-text">{step.title}</h4>
                                <span className="tdm-step-offset">
                                  Límite estimado: {step.durationLabel} (+{step.relativeOffsetDays}d)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-xs font-bold px-2 py-1 rounded-full",
                                  step.type === 'digital' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                                )}>
                                  {step.type === 'digital' ? 'Acción Digital' : 'Paso Manual'}
                                </span>
                                <button className="tdm-icon-btn" onClick={() => {
                                  setEditingStepIndex(idx);
                                  setEditingStepData(step);
                                }}>
                                  <Edit2 size={14} />
                                </button>
                                <button className="tdm-icon-btn delete" onClick={() => handleDeleteStep(activeTemplate.id, idx)}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            
                            <p className="tdm-step-desc">{step.description}</p>
                            
                            <div className="tdm-step-footer">
                              <div className="tdm-motivation-tag">
                                <Lightbulb size={16} className="inline-block mr-1"/> {step.motivation}
                              </div>
                              {step.assignedTo && (
                                <div className="tdm-assignee-tag">
                                  {(() => {
                                    const member = teamMembers.find(m => String(m.id) === String(step.assignedTo));
                                    return member ? (
                                      <>
                                        <div className="tdm-assignee-avatar">
                                          {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <span>Asignado a: <strong>{member.name}</strong> ({member.role})</span>
                                      </>
                                    ) : <span>Asignado</span>;
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button 
                  className="tdm-add-step-btn"
                  onClick={() => handleAddStep(activeTemplate.id)}
                >
                  <Plus size={16} /> Agregar Nuevo Paso
                </button>
              </div>
            ) : (
              <div>
                <p className="tdm-team-instruction">
                  Activa o desactiva con el toggle cada paso donde el miembro interviene. Luego presiona <strong>Confirmar</strong> para guardar los cambios.
                </p>

                {teamMembers.length === 0 ? (
                  <div className="tdm-team-empty">
                    <p>No hay miembros de equipo registrados. Ve a la pestaña de "Equipo" para agregarlos.</p>
                  </div>
                ) : (
                  <div className="tdm-member-list">
                    {teamMembers.map(member => {
                      const draftSteps = draftAssignment[member.id] || [];
                      const isInvolved = draftSteps.length > 0;

                      return (
                        <div key={member.id} className={`tdm-member-card ${isInvolved ? 'involved' : ''}`}>
                          <div className="tdm-member-card-body">
                            <div className="tdm-member-header">
                              <div className="tdm-member-avatar">
                                {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="tdm-member-info">
                                <h4 className="tdm-member-name">{member.name}</h4>
                                <p className="tdm-member-role">
                                  {member.role}{member.department ? ` · ${member.department}` : ''}
                                </p>
                              </div>
                              {isInvolved && (
                                <span className="tdm-badge">
                                  {draftSteps.length} paso{draftSteps.length !== 1 ? 's' : ''} asignado{draftSteps.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            <div className="tdm-toggle-container">
                              <button 
                                type="button"
                                className="tdm-toggle-btn"
                                onClick={() => setExpandedTemplateMembers(prev => ({ ...prev, [member.id]: !prev[member.id] }))}
                              >
                                {expandedTemplateMembers[member.id] ? 'Ocultar pasos' : 'Ver y asignar pasos'}
                                <span style={{ transform: expandedTemplateMembers[member.id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </span>
                              </button>
                            </div>

                            {expandedTemplateMembers[member.id] && (
                              <div className="tdm-steps-container">
                                {stepsList.map((step, sIdx) => {
                                  const isOn = draftSteps.includes(sIdx);
                                  const ownedByOther = teamMembers.find(m =>
                                    m.id !== member.id &&
                                    (draftAssignment[m.id] || []).includes(sIdx)
                                  );

                                  return (
                                    <div
                                      key={sIdx}
                                      className={`tdm-step-row ${isOn ? 'on' : ''} ${ownedByOther ? 'disabled' : ''}`}
                                    >
                                      <span className="tdm-step-row-title">
                                        <strong>Paso {sIdx + 1}</strong>
                                        {step.title}
                                        {ownedByOther && (
                                          <em>(ya asignado a {ownedByOther.name})</em>
                                        )}
                                      </span>

                                      <div className="tdm-step-toggle">
                                        <button
                                          type="button"
                                          disabled={!!ownedByOther}
                                          onClick={() => {
                                            if (ownedByOther) return;
                                            setDraftAssignment(prev => {
                                              const current = prev[member.id] || [];
                                              const next = isOn
                                                ? current.filter(i => i !== sIdx)
                                                : [...current, sIdx];
                                              return { ...prev, [member.id]: next };
                                            });
                                          }}
                                          className={`tdm-btn-yes ${isOn ? 'active' : ''}`}
                                        >Sí</button>
                                        <button
                                          type="button"
                                          disabled={!!ownedByOther}
                                          onClick={() => {
                                            if (ownedByOther) return;
                                            setDraftAssignment(prev => {
                                              const current = prev[member.id] || [];
                                              const next = isOn
                                                ? current.filter(i => i !== sIdx)
                                                : [...current, sIdx];
                                              return { ...prev, [member.id]: next };
                                            });
                                          }}
                                          className={`tdm-btn-no ${!isOn ? 'active' : ''}`}
                                        >No</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <button
                              type="button"
                              className="tdm-save-btn"
                              onClick={async () => {
                                const newSteps = stepsList.map((s, sIdx) => {
                                  if (String(s.assignedTo) === String(member.id)) {
                                    return { ...s, assignedTo: draftSteps.includes(sIdx) ? member.id : '' };
                                  }
                                  if (draftSteps.includes(sIdx) && !s.assignedTo) {
                                    return { ...s, assignedTo: member.id };
                                  }
                                  return s;
                                });
                                await saveTemplate({ ...activeTemplate, steps: newSteps });
                                onClose();
                                setTicketModal({
                                  isOpen: true,
                                  title: "¡Asignación Guardada!",
                                  message: `Se actualizaron los pasos de ${member.name} en la plantilla.`,
                                  ticketId: "Asignación de Pasos",
                                  customFields: [
                                    { label: "Colaborador", value: member.name },
                                    { label: "Plantilla", value: activeTemplate.title }
                                  ]
                                });
                              }}
                            >
                              <CheckCircle size={18} className="inline-block mr-2"/> Confirmar asignación de {member.name}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
