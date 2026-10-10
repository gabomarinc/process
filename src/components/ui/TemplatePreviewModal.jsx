import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, Edit2, X, Sparkles, CheckSquare, ListChecks, Loader2 } from 'lucide-react';
import './TemplatePreviewModal.css';

export const TemplatePreviewModal = ({ isOpen, onClose, initialData, onSave }) => {
  const [template, setTemplate] = useState(null);
  const [expandedStepIndex, setExpandedStepIndex] = useState(null);
  const [newChecklistText, setNewChecklistText] = useState({});
  const [loadingAIStep, setLoadingAIStep] = useState(null);

  useEffect(() => {
    if (isOpen && initialData) {
      const cloned = JSON.parse(JSON.stringify(initialData));
      // Ensure each step has an array for checklist
      if (Array.isArray(cloned.steps)) {
        cloned.steps = cloned.steps.map((s, idx) => ({
          ...s,
          checklist: Array.isArray(s.checklist) ? s.checklist.map((c, cIdx) => ({
            id: c.id || `chk_${idx}_${cIdx}_${Date.now()}`,
            text: typeof c === 'string' ? c : (c.text || c.title || String(c)),
            isCompleted: false
          })) : []
        }));
      }
      setTemplate(cloned);
      setExpandedStepIndex(null);
      setNewChecklistText({});
    }
  }, [isOpen, initialData]);

  if (!isOpen || !template) return null;

  const toggleStep = (index) => {
    setExpandedStepIndex(prev => prev === index ? null : index);
  };

  const handleTemplateChange = (field, value) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...template.steps];
    newSteps[index][field] = value;
    setTemplate(prev => ({ ...prev, steps: newSteps }));
  };

  const handleAddStep = () => {
    const newSteps = [...template.steps];
    newSteps.push({
      title: "Nuevo Paso",
      description: "Descripción del paso",
      type: "manual",
      relativeOffsetDays: newSteps.length + 1,
      durationLabel: `Día ${newSteps.length + 1}`,
      motivation: "¡Tú puedes!",
      checklist: []
    });
    setTemplate(prev => ({ ...prev, steps: newSteps }));
    setExpandedStepIndex(newSteps.length - 1);
  };

  const handleDeleteStep = (index) => {
    const newSteps = template.steps.filter((_, i) => i !== index);
    setTemplate(prev => ({ ...prev, steps: newSteps }));
  };

  const handleAddChecklistItem = (stepIndex, text) => {
    if (!text || !text.trim()) return;
    const newSteps = [...template.steps];
    const currentList = newSteps[stepIndex].checklist || [];
    newSteps[stepIndex].checklist = [
      ...currentList,
      {
        id: `chk_${stepIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        text: text.trim(),
        isCompleted: false
      }
    ];
    delete newSteps[stepIndex].checklistQuestion;
    setTemplate(prev => ({ ...prev, steps: newSteps }));
    setNewChecklistText(prev => ({ ...prev, [stepIndex]: '' }));
  };

  const handleDeleteChecklistItem = (stepIndex, itemIndex) => {
    const newSteps = [...template.steps];
    const currentList = newSteps[stepIndex].checklist || [];
    newSteps[stepIndex].checklist = currentList.filter((_, i) => i !== itemIndex);
    setTemplate(prev => ({ ...prev, steps: newSteps }));
  };

  const handleSuggestAIChecklist = async (stepIndex) => {
    const step = template.steps[stepIndex];
    if (!step) return;
    setLoadingAIStep(stepIndex);
    try {
      const res = await fetch('/api/ai/suggest-step-checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title: step.title, description: step.description })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.checklist) && data.checklist.length > 0) {
          const newSteps = [...template.steps];
          const existing = newSteps[stepIndex].checklist || [];
          const newItems = data.checklist.map((t, cIdx) => ({
            id: `chk_${stepIndex}_${cIdx}_${Date.now()}`,
            text: typeof t === 'string' ? t : (t.text || String(t)),
            isCompleted: false
          }));
          newSteps[stepIndex].checklist = [...existing, ...newItems];
          delete newSteps[stepIndex].checklistQuestion;
          setTemplate(prev => ({ ...prev, steps: newSteps }));
        }
      }
    } catch (err) {
      console.error('Error suggesting checklist:', err);
    } finally {
      setLoadingAIStep(null);
    }
  };

  const handleSave = () => {
    onSave(template);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <motion.div
        className="tpm-modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="tpm-header">
          <div className="tpm-header-info">
            <h2 className="tpm-header-title">
              <Edit2 size={22} style={{ color: 'var(--color-primary)' }} /> Vista Previa de Plantilla
            </h2>
            <p className="tpm-header-desc">Revisa y ajusta los detalles generales y los pasos antes de guardar la plantilla analizada.</p>
          </div>
          <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="tpm-content">
          {/* General Details Section */}
          <div className="tpm-section">
            <h3 className="tpm-section-title">Detalles Generales</h3>
            <div className="tpm-form-group">
              <label>Título de la Plantilla</label>
              <input 
                type="text"
                value={template.title} 
                onChange={e => handleTemplateChange('title', e.target.value)} 
              />
            </div>
            <div className="tpm-form-group">
              <label>Descripción</label>
              <textarea 
                value={template.description} 
                onChange={e => handleTemplateChange('description', e.target.value)} 
                rows={3}
              />
            </div>
            <div className="tpm-form-row">
              <div className="tpm-form-group">
                <label>Nombre del Guía (IA)</label>
                <input 
                  type="text"
                  value={template.companionName || ''} 
                  onChange={e => handleTemplateChange('companionName', e.target.value)} 
                />
              </div>
              <div className="tpm-form-group">
                <label>Avatar (Emoji)</label>
                <input 
                  type="text"
                  value={template.companionAvatar || ''} 
                  onChange={e => handleTemplateChange('companionAvatar', e.target.value)} 
                  maxLength={2}
                />
              </div>
            </div>
            <div className="tpm-form-group">
              <label>Saludo de Bienvenida</label>
              <textarea 
                value={template.companionGreeting || ''} 
                onChange={e => handleTemplateChange('companionGreeting', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Steps Section */}
          <div className="tpm-section">
            <div className="tpm-section-header">
              <h3 className="tpm-section-title">Pasos del Proceso ({template.steps?.length || 0})</h3>
              <button className="tpm-btn-secondary" onClick={handleAddStep}>
                <Plus size={14} /> Añadir Paso
              </button>
            </div>
            
            <div className="tpm-steps-list">
              {template.steps?.map((step, index) => {
                const isExpanded = expandedStepIndex === index;
                return (
                  <div key={index} className={`tpm-step-card ${isExpanded ? 'expanded' : ''}`}>
                    <div className="tpm-step-header" onClick={() => toggleStep(index)}>
                      <div className="tpm-step-number">{index + 1}</div>
                      <input 
                        type="text"
                        value={step.title} 
                        onChange={e => handleStepChange(index, 'title', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="tpm-step-title-input"
                      />
                      {step.checklist?.length > 0 && (
                        <span className="tpm-step-chk-badge" title={`${step.checklist.length} verificaciones en checklist`}>
                          <CheckSquare size={12} /> {step.checklist.length}
                        </span>
                      )}
                      {step.checklistQuestion && (
                        <span className="tpm-step-question-badge" title="La IA sugiere definir un checklist para este paso">
                          <Sparkles size={12} /> Sugerir Checklist
                        </span>
                      )}
                      <button 
                        className="tpm-btn-delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteStep(index); }}
                        title="Eliminar Paso"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    {isExpanded && (
                      <div className="tpm-step-body">
                        <div className="tpm-form-group">
                          <label>Descripción del Paso</label>
                          <textarea 
                            value={step.description} 
                            onChange={e => handleStepChange(index, 'description', e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="tpm-form-row">
                          <div className="tpm-form-group">
                            <label>Día (Offset)</label>
                            <input 
                              type="number" 
                              value={step.relativeOffsetDays || 0} 
                              onChange={e => handleStepChange(index, 'relativeOffsetDays', parseInt(e.target.value))} 
                            />
                          </div>
                          <div className="tpm-form-group">
                            <label>Tipo de Paso</label>
                            <select 
                              value={step.type} 
                              onChange={e => handleStepChange(index, 'type', e.target.value)}
                            >
                              <option value="manual">Manual</option>
                              <option value="digital">Digital (Subir Archivo)</option>
                            </select>
                          </div>
                        </div>

                        {/* Client Email Notification Trigger */}
                        <div style={{ marginTop: '0.6rem', background: '#F0FDFA', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CCFBF1' }}>
                          <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#0F766E' }}>
                            <input
                              type="checkbox"
                              checked={!!step.notifyClientEmail}
                              onChange={(e) => handleStepChange(index, 'notifyClientEmail', e.target.checked)}
                              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#0D9488' }}
                            />
                            <span>📧 Notificar automáticamente al cliente por correo al completar este paso</span>
                          </label>
                          {step.notifyClientEmail && (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '22px' }}>
                              <input
                                type="text"
                                placeholder={`Asunto: Actualización de ${step.title || 'Paso'}`}
                                value={step.clientEmailSubject || ''}
                                onChange={(e) => handleStepChange(index, 'clientEmailSubject', e.target.value)}
                                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #99F6E4', borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                              />
                              <textarea
                                rows={2}
                                placeholder="Mensaje / Acción requerida por el cliente (Opcional)..."
                                value={step.clientEmailBody || ''}
                                onChange={(e) => handleStepChange(index, 'clientEmailBody', e.target.value)}
                                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #99F6E4', borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Checklist Section for this step */}
                        <div className="tpm-step-checklist-section">
                          {step.checklistQuestion && (
                            <div className="tpm-ai-question-box">
                              <Sparkles size={15} color="#27BEA5" style={{ flexShrink: 0 }} />
                              <div>
                                <strong>Consulta de IA sobre este paso:</strong>
                                <p>{step.checklistQuestion}</p>
                              </div>
                            </div>
                          )}

                          <div className="tpm-checklist-header">
                            <label className="tpm-checklist-title">
                              <ListChecks size={14} /> Checklist / Verificaciones del Paso ({step.checklist?.length || 0})
                            </label>
                            <button 
                              type="button" 
                              className="tpm-btn-ai-suggest"
                              onClick={() => handleSuggestAIChecklist(index)}
                              disabled={loadingAIStep === index}
                              title="Analizar este paso y generar sugerencias con IA"
                            >
                              {loadingAIStep === index ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
                              {loadingAIStep === index ? 'Analizando...' : 'Sugerir con IA'}
                            </button>
                          </div>

                          {/* Existing checklist items */}
                          <div className="tpm-checklist-items-list">
                            {(step.checklist || []).map((item, itemIdx) => (
                              <div key={item.id || itemIdx} className="tpm-checklist-item-row">
                                <CheckSquare size={13} color="#27BEA5" />
                                <span className="tpm-checklist-item-text">{item.text}</span>
                                <button 
                                  type="button"
                                  className="tpm-checklist-item-del"
                                  onClick={() => handleDeleteChecklistItem(index, itemIdx)}
                                  title="Eliminar ítem"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                            {(!step.checklist || step.checklist.length === 0) && (
                              <span className="tpm-checklist-empty-hint">
                                Sin checklist asignado. Puedes añadir tareas o pulsar "Sugerir con IA".
                              </span>
                            )}
                          </div>

                          {/* Add new checklist item input */}
                          <div className="tpm-checklist-add-row">
                            <input 
                              type="text"
                              placeholder="Añadir verificación o sub-tarea..."
                              value={newChecklistText[index] || ''}
                              onChange={e => setNewChecklistText(prev => ({ ...prev, [index]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddChecklistItem(index, newChecklistText[index]);
                                }
                              }}
                              className="tpm-checklist-add-input"
                            />
                            <button 
                              type="button"
                              className="tpm-btn-add-chk"
                              onClick={() => handleAddChecklistItem(index, newChecklistText[index])}
                              disabled={!(newChecklistText[index] || '').trim()}
                            >
                              <Plus size={13} /> Añadir
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="tpm-footer">
          <button className="tpm-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="tpm-btn-save" onClick={handleSave}>
            <Save size={16} /> Guardar Plantilla
          </button>
        </div>
      </motion.div>
    </div>
  );
};
