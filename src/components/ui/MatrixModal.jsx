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
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId('');
      setSelectedTemplate(null);
      setAssignments({});
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
        template.steps.forEach((s, idx) => {
          if (s) {
            initial[idx] = Array.isArray(s.assignedTo)
              ? s.assignedTo.map(String)
              : s.assignedTo ? [String(s.assignedTo)] : [];
          } else {
            initial[idx] = [];
          }
        });
        setAssignments(initial);
      }
    } else {
      setSelectedTemplate(null);
      setAssignments({});
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
      const assigned = assignments[idx] || [];
      return {
        ...s,
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
            {step === 2 && "Asigna uno o múltiples responsables para cada uno de los pasos del proceso."}
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
                    
                    // Render current selection text
                    const selectedNames = teamMembers
                      .filter(m => stepAssignedIds.includes(String(m.id)))
                      .map(m => m.name);
                    
                    const triggerText = selectedNames.length > 0
                      ? selectedNames.join(', ')
                      : "Elegir responsables...";

                    const isDropdownOpen = activeDropdownIndex === idx;

                    return (
                      <div key={idx} className="matrix-step-item-card">
                        <div className="matrix-step-item-header">
                          <span className="matrix-step-item-number">Paso {idx + 1}</span>
                          <h4 className="matrix-step-item-title">{stepItem.title}</h4>
                        </div>
                        
                        <div className="matrix-form-group">
                          <label className="matrix-form-label">Responsables</label>
                          <div className="matrix-multiselect-dropdown" ref={isDropdownOpen ? dropdownRef : null}>
                            <button
                              type="button"
                              className="matrix-multiselect-trigger"
                              onClick={() => setActiveDropdownIndex(isDropdownOpen ? null : idx)}
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
                                  return (
                                    <div
                                      key={member.id}
                                      className="matrix-multiselect-option"
                                      onClick={() => {
                                        setAssignments(prev => {
                                          const current = prev[idx] || [];
                                          const updated = isChecked
                                            ? current.filter(id => id !== String(member.id))
                                            : [...current, String(member.id)];
                                          return { ...prev, [idx]: updated };
                                        });
                                      }}
                                    >
                                      {isChecked ? (
                                        <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                                      ) : (
                                        <Square size={16} style={{ color: '#cbd5e1' }} />
                                      )}
                                      <span>
                                        {member.name} <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({member.role})</span>
                                      </span>
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
                    const assignedMembers = teamMembers.filter(m => stepAssignedIds.includes(String(m.id)));

                    return (
                      <div key={idx} className="matrix-preview-item">
                        <div className="matrix-preview-number">{idx + 1}</div>
                        <div className="matrix-preview-info">
                          <span className="matrix-preview-title">{stepItem.title}</span>
                          <span className="matrix-preview-assigned">
                            {assignedMembers.length > 0 
                              ? `Responsables: ${assignedMembers.map(m => m.name).join(', ')}`
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
