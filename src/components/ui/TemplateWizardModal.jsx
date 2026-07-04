import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft, X, Check } from 'lucide-react';

const steps = [
  { id: 'name', title: 'Nombre' },
  { id: 'objective', title: 'Objetivo' },
  { id: 'milestones', title: 'Hitos' },
  { id: 'duration', title: 'Duración' }
];

export const TemplateWizardModal = ({ isOpen, onClose, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    milestones: '',
    duration: ''
  });

  if (!isOpen) return null;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const promptString = `
    Nombre del proceso: ${formData.name}
    Objetivo principal: ${formData.objective}
    Hitos o entregables clave: ${formData.milestones}
    Duración aproximada: ${formData.duration} días
    `;
    onSubmit(promptString, formData.name);
    setCurrentStep(0);
    setFormData({ name: '', objective: '', milestones: '', duration: '' });
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.name.trim() !== '';
      case 1:
        return formData.objective.trim() !== '';
      case 2:
        return formData.milestones.trim() !== '';
      case 3:
        return formData.duration !== '';
      default:
        return true;
    }
  };

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
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            return (
              <div key={index} className={`custom-wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div
                  className="custom-wizard-step-dot"
                  onClick={() => {
                    if (index <= currentStep) {
                      setCurrentStep(index);
                    }
                  }}
                  style={{ cursor: index <= currentStep ? 'pointer' : 'default' }}
                >
                  {isCompleted ? <Check size={16}/> : index + 1}
                </div>
                <span className="custom-wizard-step-label">{step.title}</span>
              </div>
            );
          })}
        </div>

        <div className="custom-wizard-header">
          <h2 className="custom-wizard-title">
            <Sparkles size={24} style={{ color: 'var(--color-primary)' }} /> Asistente de Plantillas
          </h2>
          <p className="custom-wizard-description">
            {currentStep === 0 && "¿Cómo se llama el proceso que deseas crear?"}
            {currentStep === 1 && "¿Cuál es el objetivo principal de este proceso?"}
            {currentStep === 2 && "¿Cuáles son los entregables o hitos clave de este proceso?"}
            {currentStep === 3 && "¿Aproximadamente cuántos días dura en total este proceso?"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="custom-wizard-form">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Nombre */}
              {currentStep === 0 && (
                <div>
                  <label htmlFor="name" className="custom-wizard-label">Nombre del Proceso</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Ej: Onboarding de nuevos empleados..."
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    className="custom-wizard-input"
                    autoFocus
                  />
                </div>
              )}

              {/* Step 2: Objetivo */}
              {currentStep === 1 && (
                <div>
                  <label htmlFor="objective" className="custom-wizard-label">Descripción del Objetivo</label>
                  <textarea
                    id="objective"
                    placeholder="Ej: Asegurar que el empleado tenga todos sus accesos listos el primer día..."
                    value={formData.objective}
                    onChange={(e) => updateFormData('objective', e.target.value)}
                    className="custom-wizard-input"
                    style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
                    autoFocus
                  />
                </div>
              )}

              {/* Step 3: Hitos */}
              {currentStep === 2 && (
                <div>
                  <label htmlFor="milestones" className="custom-wizard-label">Lista de Hitos</label>
                  <textarea
                    id="milestones"
                    placeholder="Ej: Firmar contrato, Entrega de laptop, Presentación al equipo..."
                    value={formData.milestones}
                    onChange={(e) => updateFormData('milestones', e.target.value)}
                    className="custom-wizard-input"
                    style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
                    autoFocus
                  />
                </div>
              )}

              {/* Step 4: Duración */}
              {currentStep === 3 && (
                <div>
                  <label htmlFor="duration" className="custom-wizard-label">Número de Días</label>
                  <input
                    id="duration"
                    type="number"
                    placeholder="Ej: 5"
                    value={formData.duration}
                    onChange={(e) => updateFormData('duration', e.target.value)}
                    min="1"
                    className="custom-wizard-input"
                    autoFocus
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer controls */}
          <div className="custom-wizard-footer">
            <button
              type="button"
              className="custom-wizard-btn-back"
              onClick={prevStep}
              disabled={currentStep === 0}
              style={{ opacity: currentStep === 0 ? 0.5 : 1, cursor: currentStep === 0 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} /> Atrás
            </button>
            <button
              type="button"
              className="custom-wizard-btn-next"
              onClick={currentStep === steps.length - 1 ? handleSubmit : nextStep}
              disabled={!isStepValid()}
            >
              {currentStep === steps.length - 1 ? "Generar Plantilla" : "Siguiente"}
              {currentStep === steps.length - 1 ? (
                <Sparkles size={16} style={{ marginLeft: '4px' }} />
              ) : (
                <ChevronRight size={16} style={{ marginLeft: '4px' }} />
              )}
            </button>
          </div>
          <div className="custom-wizard-step-info">
            Paso {currentStep + 1} de {steps.length}
          </div>
        </form>
      </motion.div>
    </div>
  );
};
