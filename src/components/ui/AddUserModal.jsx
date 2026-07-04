import React from 'react';
import { X, Check, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AddUserModal = ({
  isOpen,
  onClose,
  step,
  setStep,
  formData,
  setFormData,
  handleSave,
  error,
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
    }
    setStep(prev => prev + 1);
  };

  const stepsList = [
    { label: "Información" },
    { label: "Rol & Accesos" }
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
          <button type="button" className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
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
            <User size={20} className="inline-block mr-2"/> Registrar Nuevo Usuario
          </h2>
          <p className="custom-wizard-description">
            {step === 1 && "Ingresa los datos generales para crear el perfil de usuario de la organización."}
            {step === 2 && "Genera una contraseña temporal y define los accesos del nuevo usuario."}
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={step < 2 ? handleNextStep : handleSave} className="custom-wizard-form">
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
                    placeholder="Ej. Juan Doe"
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
                    placeholder="juan@empresa.com"
                    className="custom-wizard-input"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="custom-wizard-label">Contraseña Temporal *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    autoFocus
                    placeholder="••••••••"
                    className="custom-wizard-input"
                  />
                </div>

                <div>
                  <label className="custom-wizard-label">Rol del Usuario *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="custom-wizard-input"
                  >
                    <option value="agent">Agente (Miembro de equipo)</option>
                    <option value="guest">Invitado (Cliente o Proveedor)</option>
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', marginBlockEnd: 0 }}>
                    Los invitados tienen un límite estricto de hasta 10 por empresa.
                  </p>
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
                  setStep(1);
                } else {
                  onClose();
                }
              }}
            >
              {step > 1 ? 'Atrás' : 'Cancelar'}
            </button>
            <button type="submit" className="custom-wizard-btn-next">
              {step === 2 ? 'Crear' : 'Siguiente'}
            </button>
          </div>
          <div className="custom-wizard-step-info">
            Paso {step} de 2
          </div>
        </form>
      </motion.div>
    </div>
  );
};
