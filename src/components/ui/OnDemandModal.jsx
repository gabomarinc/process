import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useAlert } from '../../contexts/AlertContext';

export function OnDemandModal({ isOpen, onClose }) {
  const [toolName, setToolName] = useState('');
  const [useCase, setUseCase] = useState('');
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!toolName || !useCase) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ondemand-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ toolName, useCase })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar la solicitud');
      }

      showAlert('success', '¡Solicitud enviada!', 'Nos pondremos en contacto pronto.');
      setToolName('');
      setUseCase('');
      onClose();
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', error.message || 'No se pudo enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Sparkles size={40} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Integración On Demand</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            Cuéntanos qué herramienta necesitas conectar.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>¿Qué herramienta buscas conectar?</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Salesforce, HubSpot, SAP..."
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>¿Para qué necesitas esta integración?</label>
            <textarea
              className="form-input"
              placeholder="Describe brevemente el flujo o caso de uso..."
              rows={4}
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}
          >
            {loading ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </form>
      </div>
    </div>
  );
}
