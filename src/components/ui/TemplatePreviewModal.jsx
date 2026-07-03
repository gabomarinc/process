import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Edit2, Check, GripVertical, Trash2, Plus } from 'lucide-react';
import './TemplatePreviewModal.css';

export const TemplatePreviewModal = ({ isOpen, onClose, initialTemplate, onSave }) => {
  const [template, setTemplate] = useState(null);
  
  useEffect(() => {
    if (initialTemplate) {
      setTemplate(JSON.parse(JSON.stringify(initialTemplate))); // deep copy
    }
  }, [initialTemplate, isOpen]);

  if (!isOpen || !template) return null;

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
  };

  const handleDeleteStep = (index) => {
    const newSteps = template.steps.filter((_, i) => i !== index);
    setTemplate(prev => ({ ...prev, steps: newSteps }));
  };

  const handleSave = () => {
    onSave(template);
  };

  return (
    <div className="modal-overlay">
      <motion.div
        className="modal-container preview-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="icon-circle primary">
              <Edit2 size={20} />
            </div>
            <h2 className="modal-title">Vista Previa de Plantilla</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-content scrollable-content">
          <div className="preview-section">
            <h3 className="section-subtitle">Detalles Generales</h3>
            <div className="form-group">
              <label>Título de la Plantilla</label>
              <input type="text" className="form-input" value={template.title} onChange={e => handleTemplateChange('title', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea className="form-input" rows={2} value={template.description} onChange={e => handleTemplateChange('description', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Nombre del Guía (IA)</label>
                <input type="text" className="form-input" value={template.companionName || ''} onChange={e => handleTemplateChange('companionName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Avatar (Emoji)</label>
                <input type="text" className="form-input" value={template.companionAvatar || ''} onChange={e => handleTemplateChange('companionAvatar', e.target.value)} maxLength={2} />
              </div>
            </div>
            <div className="form-group">
              <label>Saludo de Bienvenida</label>
              <textarea className="form-input" rows={2} value={template.companionGreeting || ''} onChange={e => handleTemplateChange('companionGreeting', e.target.value)} />
            </div>
          </div>

          <div className="preview-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="section-subtitle" style={{ margin: 0 }}>Pasos del Proceso ({template.steps?.length || 0})</h3>
              <button className="btn btn-secondary btn-sm" onClick={handleAddStep}>
                <Plus size={14} /> Añadir Paso
              </button>
            </div>
            
            <div className="steps-editor-list">
              {template.steps?.map((step, index) => (
                <div key={index} className="step-editor-card">
                  <div className="step-editor-header">
                    <div className="step-number">{index + 1}</div>
                    <input type="text" className="form-input step-title-input" value={step.title} onChange={e => handleStepChange(index, 'title', e.target.value)} />
                    <button className="circle-btn red" onClick={() => handleDeleteStep(index)}><Trash2 size={14} /></button>
                  </div>
                  <div className="step-editor-body">
                    <div className="form-group">
                      <label>Descripción</label>
                      <textarea className="form-input" rows={2} value={step.description} onChange={e => handleStepChange(index, 'description', e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Día (Offset)</label>
                        <input type="number" className="form-input" value={step.relativeOffsetDays || 0} onChange={e => handleStepChange(index, 'relativeOffsetDays', parseInt(e.target.value))} />
                      </div>
                      <div className="form-group">
                        <label>Tipo</label>
                        <select className="form-input" value={step.type} onChange={e => handleStepChange(index, 'type', e.target.value)}>
                          <option value="manual">Manual</option>
                          <option value="digital">Digital (Subir Archivo)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Save size={16} style={{ marginRight: '6px' }} /> Guardar Plantilla
          </button>
        </div>
      </motion.div>
    </div>
  );
};
