import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, Edit2, X } from 'lucide-react';
import './TemplatePreviewModal.css';

export const TemplatePreviewModal = ({ isOpen, onClose, initialData, onSave }) => {
  const [template, setTemplate] = useState(null);
  const [expandedStepIndex, setExpandedStepIndex] = useState(null);

  useEffect(() => {
    if (isOpen && initialData) {
      setTemplate(JSON.parse(JSON.stringify(initialData)));
      setExpandedStepIndex(null);
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
      motivation: "¡Tú puedes!"
    });
    setTemplate(prev => ({ ...prev, steps: newSteps }));
    setExpandedStepIndex(newSteps.length - 1);
  };

  const handleDeleteStep = (index) => {
    const newSteps = template.steps.filter((_, i) => i !== index);
    setTemplate(prev => ({ ...prev, steps: newSteps }));
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
