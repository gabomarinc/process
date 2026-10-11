import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Share2, ClipboardList, AlertCircle, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './MatrixModal.css';

export const MatrixModal = ({
  isOpen,
  onClose,
  step,
  setStep,
  templates,
  teamMembers,
  handleSave, // function (updatedTemplate) => Promise/void
  showAlert
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Local state for assignments during step 2.
  // Format: { [stepIndex]: [memberId1, memberId2, ...] }
  const [assignments, setAssignments] = useState({});
  const [leads, setLeads] = useState({});
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId('');
      setSelectedTemplate(null);
      setAssignments({});
      setLeads({});
      setActiveDropdownIndex(null);
    }
  }, [isOpen]);

  // Sync selected template and initialize assignments
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => String(t.id) === String(selectedTemplateId));
      setSelectedTemplate(template);
      
      if (template && template.steps) {
        const initial = {};
        const initialLeads = {};
        template.steps.forEach((s, idx) => {
          if (s) {
            const rawAssigned = Array.isArray(s.assignedTo)
              ? s.assignedTo.map(String)
              : (s.assignedTo && s.assignedTo !== 'Unassigned' ? [String(s.assignedTo)] : []);
            const stepLead = s.leadId && s.leadId !== 'Unassigned' ? String(s.leadId) : '';
            initial[idx] = Array.from(new Set([...(stepLead ? [stepLead] : []), ...rawAssigned]));
            initialLeads[idx] = stepLead;
          } else {
            initial[idx] = [];
            initialLeads[idx] = '';
          }
        });
        setAssignments(initial);
        setLeads(initialLeads);
      }
    } else {
      setSelectedTemplate(null);
      setAssignments({});
      setLeads({});
    }
  }, [selectedTemplateId, templates]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (!isOpen) return null;

  const handleNextStep = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!selectedTemplateId) {
        showAlert("Por favor, selecciona una plantilla para continuar.");
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleConfirmSave = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    // Build the updated steps array
    const updatedSteps = selectedTemplate.steps.map((s, idx) => {
      const assigned = [...(assignments[idx] || [])];
      const leadId = leads[idx] ? String(leads[idx]) : '';
      if (leadId && !assigned.includes(leadId)) {
        assigned.push(leadId);
      }
      return {
        ...s,
        leadId,
        assignedTo: assigned
      };
    });

    const updatedTemplate = {
      ...selectedTemplate,
      steps: updatedSteps
    };

    await handleSave(updatedTemplate);
    onClose();
  };

  const stepsList = [
    { label: "Plantilla" },
    { label: "Responsables" },
    { label: "Vista Previa" }
  ];

  return (
    <div className="matrix-modal-overlay" onClick={onClose}>
      <motion.div
        className="matrix-wizard-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <button 
            className="close-btn-aesthetic" 
            onClick={onClose} 
            title="Cerrar"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="matrix-wizard-stepper">
          {stepsList.map((s, idx) => {
            const isCompleted = idx + 1 < step;
            const isActive = idx + 1 === step;
            return (
              <div key={idx} className={`matrix-wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="matrix-wizard-step-dot">
                  {isCompleted ? <Check size={16}/> : idx + 1}
                </div>
                <span className="matrix-wizard-step-label">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="matrix-wizard-header">
          <h2 className="matrix-wizard-title">
            <Share2 size={20} className="inline-block mr-2" style={{ color: 'var(--color-primary)' }}/> Asignación Matricial
          </h2>
          <p className="matrix-wizard-description">
            {step === 1 && "Selecciona la plantilla de procesos para configurar."}
            {step === 2 && "Asigna múltiples colaboradores a cada paso y marca libremente quién será el 👑 Encargado Principal."}
            {step === 3 && "Verifica la asignación matricial antes de guardar los cambios."}
          </p>
        </div>

        <form onSubmit={step < 3 ? handleNextStep : handleConfirmSave} className="matrix-wizard-form">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }} 
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <div className="matrix-form-group">
                  <label className="matrix-form-label">Plantilla de Proceso *</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    required
                    className="matrix-form-input matrix-select-custom"
                  >
                    <option value="">Selecciona una plantilla...</option>
                    {templates.map(temp => (
                      <option key={temp.id} value={temp.id}>
                        {temp.title} ({temp.category || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
                {templates.length === 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.75rem', borderRadius: '8px', color: '#b45309', fontSize: '0.8rem' }}>
                    <AlertCircle size={16} />
                    <span>No hay plantillas creadas. Por favor crea una primero en la sección de Plantillas.</span>
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && selectedTemplate && (
              <motion.div 
                key="step2" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }} 
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <div className="matrix-steps-list-container">
                  {(selectedTemplate.steps || []).map((stepItem, idx) => {
                    const stepAssignedIds = assignments[idx] || [];
                    const currentLeadId = leads[idx] || '';
                    
                    // Render current selection text
                    const selectedMembers = teamMembers.filter(m => stepAssignedIds.includes(String(m.id)));
                    const selectedNames = selectedMembers.map(m => m.name);
                    
                    const triggerText = selectedNames.length > 0
                      ? selectedNames.join(', ')
                      : "Elegir colaboradores...";

                    const isDropdownOpen = activeDropdownIndex === idx;

                    return (
                      <div key={idx} className="matrix-step-item-card">
                        <div className="matrix-step-item-header">
                          <span className="matrix-step-item-number">Paso {idx + 1}</span>
                          <h4 className="matrix-step-item-title">{stepItem.title}</h4>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div className="matrix-form-group" style={{ margin: 0 }}>
                            <label className="matrix-form-label">👑 Encargado Principal</label>
                            <select
                              value={currentLeadId}
                              onChange={(e) => {
                                const newLead = e.target.value;
                                setLeads(prev => ({ ...prev, [idx]: newLead }));
                                if (newLead) {
                                  setAssignments(prev => {
                                    const current = prev[idx] || [];
                                    return {
                                      ...prev,
                                      [idx]: Array.from(new Set([...current, String(newLead)]))
                                    };
                                  });
                                }
                              }}
                              className="matrix-form-input matrix-select-custom"
                              style={{ height: '38px', padding: '0 0.65rem', fontSize: '0.82rem' }}
                            >
                              <option value="">-- Elegir Encargado Principal --</option>
                              {teamMembers.map(m => (
                                <option key={m.id} value={String(m.id)}>
                                  {m.name} ({m.role})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="matrix-form-group" style={{ margin: 0 }}>
                            <label className="matrix-form-label">👥 Colaboradores Asignados (Varios)</label>
                            <div className="matrix-multiselect-dropdown" ref={isDropdownOpen ? dropdownRef : null}>
                              <button
                                type="button"
                                className="matrix-multiselect-trigger"
                                onClick={() => setActiveDropdownIndex(isDropdownOpen ? null : idx)}
                                style={{ height: '38px' }}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                                  {triggerText}
                                </span>
                                <ChevronDown size={16} style={{ color: '#64748b' }} />
                              </button>

                              {isDropdownOpen && (
                                <div className="matrix-multiselect-menu">
                                  {teamMembers.map(member => {
                                    const isChecked = stepAssignedIds.includes(String(member.id));
                                    const isLead = String(currentLeadId) === String(member.id);
                                    return (
                                      <div
                                        key={member.id}
                                        className="matrix-multiselect-option"
                                        style={{ justifyContent: 'space-between' }}
                                        onClick={() => {
                                          setAssignments(prev => {
                                            const current = prev[idx] || [];
                                            const updated = isChecked
                                              ? current.filter(id => id !== String(member.id))
                                              : [...current, String(member.id)];
                                            if (isChecked && String(leads[idx]) === String(member.id)) {
                                              setLeads(prevLeads => ({ ...prevLeads, [idx]: '' }));
                                            }
                                            return { ...prev, [idx]: updated };
                                          });
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                          {isChecked ? (
                                            <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                                          ) : (
                                            <Square size={16} style={{ color: '#cbd5e1' }} />
                                          )}
                                          <span>
                                            {member.name} <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({member.role})</span>
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isLead) {
                                              setLeads(prevLeads => ({ ...prevLeads, [idx]: '' }));
                                            } else {
                                              setLeads(prevLeads => ({ ...prevLeads, [idx]: String(member.id) }));
                                              if (!isChecked) {
                                                setAssignments(prev => ({
                                                  ...prev,
                                                  [idx]: [...(prev[idx] || []), String(member.id)]
                                                }));
                                              }
                                            }
                                          }}
                                          style={{
                                            fontSize: '0.66rem',
                                            background: isLead ? '#0D9488' : '#F1F5F9',
                                            color: isLead ? '#FFFFFF' : '#475569',
                                            border: isLead ? '1px solid #0D9488' : '1px solid #CBD5E1',
                                            padding: '2px 7px',
                                            borderRadius: '999px',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                          }}
                                        >
                                          {isLead ? '👑 Principal' : '👑 Hacer Principal'}
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {teamMembers.length === 0 && (
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem' }}>
                                      No hay miembros de equipo registrados.
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive chips below so user can switch Principal in 1 click */}
                        {selectedMembers.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                            {selectedMembers.map(m => {
                              const isLead = String(currentLeadId) === String(m.id);
                              return (
                                <span
                                  key={m.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '0.73rem',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: isLead ? '#CCFBF1' : '#F1F5F9',
                                    color: isLead ? '#0F766E' : '#334155',
                                    border: isLead ? '1px solid #0D9488' : '1px solid #E2E8F0',
                                    fontWeight: isLead ? 700 : 600
                                  }}
                                >
                                  <span>{isLead ? `👑 Principal: ${m.name}` : `👤 ${m.name}`}</span>
                                  {!isLead && (
                                    <button
                                      type="button"
                                      onClick={() => setLeads(prev => ({ ...prev, [idx]: String(m.id) }))}
                                      style={{
                                        background: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '999px',
                                        padding: '1px 6px',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        color: '#0F766E',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      👑 Hacer Principal
                                    </button>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 3 && selectedTemplate && (
              <motion.div 
                key="step3" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }} 
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <div className="matrix-preview-container">
                  <div className="matrix-preview-header">
                    Resumen de asignaciones para la plantilla: <strong>{selectedTemplate.title}</strong>
                  </div>
                  
                  {(selectedTemplate.steps || []).map((stepItem, idx) => {
                    const stepAssignedIds = assignments[idx] || [];
                    const currentLeadId = leads[idx] || '';
                    const leadMember = teamMembers.find(m => String(m.id) === String(currentLeadId));
                    const assignedMembers = teamMembers.filter(m => stepAssignedIds.includes(String(m.id)));

                    return (
                      <div key={idx} className="matrix-preview-item">
                        <div className="matrix-preview-number">{idx + 1}</div>
                        <div className="matrix-preview-info">
                          <span className="matrix-preview-title">{stepItem.title}</span>
                          <span className="matrix-preview-assigned">
                            {assignedMembers.length > 0 
                              ? `${leadMember ? `👑 Encargado: ${leadMember.name} · ` : ''}👥 Asignados: ${assignedMembers.map(m => m.name).join(', ')}`
                              : "Sin responsables asignados"
                            }
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer controls */}
          <div className="matrix-wizard-footer">
            <button
              type="button"
              className="matrix-wizard-btn-back"
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
            <button type="submit" className="matrix-wizard-btn-next">
              {step === 3 ? 'Confirmar y Guardar' : 'Siguiente'}
            </button>
          </div>
          <div className="matrix-wizard-step-info">
            Paso {step} de 3
          </div>
        </form>
      </motion.div>
    </div>
  );
};
