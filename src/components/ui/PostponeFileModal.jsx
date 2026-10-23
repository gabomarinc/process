import React, { useState } from 'react';
import { X, Clock, Calendar, AlertCircle, FileText, CheckCircle2, User } from 'lucide-react';

export default function PostponeFileModal({
  isOpen,
  onClose,
  onConfirm,
  instance,
  step,
  checklist,
  leadName = 'Responsable'
}) {
  if (!isOpen || !step || !checklist) return null;

  // Fecha mínima: mañana o hoy
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // 2 días por defecto
    return d.toISOString().split('T')[0];
  })();

  const [postponedDate, setPostponedDate] = useState(checklist.postponedUntil || defaultDate);
  const [reason, setReason] = useState(checklist.postponedReason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!postponedDate) return;
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        postponedUntil: postponedDate,
        reason: reason.trim()
      });
      onClose();
    } catch (err) {
      console.error('Error al posponer entrega de archivo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const chkTitle = checklist.text || (typeof checklist === 'string' ? checklist : 'Archivo Requerido');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            borderBottom: '1px solid #FDE68A'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#F59E0B',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#92400E' }}>
                Posponer Entrega de Archivo
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600 }}>
                Habilita el avance temporal pactando una nueva fecha compromiso
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="close-btn-aesthetic"
            style={{
              background: '#FFFFFF',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#92400E'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Context Information Box */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748B' }}>
              <FileText size={13} color="#0D9488" />
              <span>Entregable Obligatorio:</span>
              <strong style={{ color: '#0F172A' }}>{chkTitle}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748B' }}>
              <User size={13} color="#6366F1" />
              <span>Responsable del Paso:</span>
              <strong style={{ color: '#0F172A' }}>{leadName}</strong>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Field: Nueva Fecha Específica */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1E293B',
                  marginBottom: '6px'
                }}
              >
                <Calendar size={14} color="#D97706" />
                Fecha Límite para Adjuntar el Archivo: <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                min={todayStr}
                required
                value={postponedDate}
                onChange={(e) => setPostponedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#0F172A',
                  outline: 'none',
                  background: '#FFFFFF'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '4px' }}>
                El sistema enviará recordatorios automáticos al responsable 1 día antes y en la fecha límite fijada.
              </span>
            </div>

            {/* Field: Motivo Obligatorio */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1E293B',
                  marginBottom: '6px'
                }}
              >
                <AlertCircle size={14} color="#D97706" />
                Motivo por el cual no se tiene el archivo ahora: <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Ejemplo: El cliente solicitó 48 horas adicionales para firmar la minuta. La gerencia ya tiene el borrador aprobado por correo."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.83rem',
                  lineHeight: '1.45',
                  color: '#0F172A',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '4px' }}>
                Este motivo quedará registrado en el historial del entregable y se notificará al responsable del paso.
              </span>
            </div>

            {/* Banner Informativo */}
            <div
              style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '0.78rem',
                color: '#065F46',
                lineHeight: '1.4'
              }}
            >
              <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Habilitación de avance:</strong> Al confirmar, podrás marcar este punto del checklist como avanzado y completar el paso sin que la falta del archivo te bloquee el flujo.
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '0.5rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #F1F5F9'
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.83rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !postponedDate || !reason.trim()}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: (!postponedDate || !reason.trim() || isSubmitting) ? '#94A3B8' : '#D97706',
                  color: '#FFFFFF',
                  fontSize: '0.83rem',
                  fontWeight: 700,
                  cursor: (!postponedDate || !reason.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
                }}
              >
                <Clock size={15} />
                {isSubmitting ? 'Guardando...' : 'Confirmar y Habilitar Avance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
