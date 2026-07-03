import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import './TemplateWizardModal.css';

export const TemplateWizardModal = ({ isOpen, onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    milestones: '',
    duration: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 4));
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    const promptString = `
    Nombre del proceso: ${formData.name}
    Objetivo principal: ${formData.objective}
    Hitos o entregables clave: ${formData.milestones}
    Duración aproximada: ${formData.duration} días
    `;
    onSubmit(promptString, formData.name);
    // Reset form after submission
    setStep(1);
    setFormData({ name: '', objective: '', milestones: '', duration: '' });
  };

  return (
    <div className="modal-overlay">
      <motion.div
        className="modal-card wizard-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="icon-circle primary">
              <Sparkles size={20} />
            </div>
            <h2 className="modal-title">Asistente de Plantillas</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-content">
          <div className="wizard-progress">
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
            <span className="step-indicator">Paso {step} de 4</span>
          </div>

          <form onSubmit={handleSubmit} className="wizard-form">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="form-group">
                  <label>¿Cómo se llama el proceso?</label>
                  <p className="field-hint">Ej: Onboarding de nuevos empleados, Revisión de contratos, etc.</p>
                  <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} placeholder="Nombre del proceso..." required autoFocus />
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="form-group">
                  <label>¿Cuál es el objetivo principal?</label>
                  <p className="field-hint">Ej: Asegurar que el empleado tenga todos sus accesos listos el primer día.</p>
                  <textarea name="objective" className="form-input" rows={3} value={formData.objective} onChange={handleChange} placeholder="Objetivo del proceso..." required autoFocus />
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="form-group">
                  <label>¿Cuáles son los entregables o hitos clave?</label>
                  <p className="field-hint">Ej: Firmar contrato, Entrega de laptop, Presentación al equipo.</p>
                  <textarea name="milestones" className="form-input" rows={3} value={formData.milestones} onChange={handleChange} placeholder="Hitos principales..." required autoFocus />
                </motion.div>
              )}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="form-group">
                  <label>¿Aproximadamente cuántos días dura en total?</label>
                  <p className="field-hint">Ingresa el número de días estimado.</p>
                  <input type="number" name="duration" className="form-input" value={formData.duration} onChange={handleChange} placeholder="Ej: 5" required min="1" autoFocus />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="wizard-footer">
              <button type="button" className="btn btn-secondary" onClick={step === 1 ? onClose : handlePrev}>
                {step === 1 ? "Cancelar" : <><ChevronLeft size={16} /> Atrás</>}
              </button>
              {step < 4 ? (
                <button type="button" className="btn btn-primary" onClick={handleNext} disabled={(step === 1 && !formData.name) || (step === 2 && !formData.objective) || (step === 3 && !formData.milestones)}>
                  Siguiente <ChevronRight size={16} />
                </button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={!formData.duration}>
                  Generar Plantilla <Sparkles size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
