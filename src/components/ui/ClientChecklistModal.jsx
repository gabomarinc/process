import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, DollarSign, Video, LayoutGrid, FileText, Sparkles } from 'lucide-react';
import { getClientTrafficLightStatus } from '../../utils/clientSemaforo';
import './ClientChecklistModal.css';

export default function ClientChecklistModal({
  isOpen,
  onClose,
  client,
  onSaveChecklist
}) {
  if (!isOpen || !client) return null;

  const initialChecklist = client.checklist || {
    carrusel: { checked: false, current: 0, target: 4 },
    post: { checked: false, current: 0, target: 12 },
    video: { checked: false, current: 0, target: 6 },
    facturaPaga: { checked: false },
    adsRating: 'Excelente'
  };

  const [formState, setFormState] = useState(initialChecklist);
  const [expandedSection, setExpandedSection] = useState(null); // 'carrusel' | 'post' | 'video' | null
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (client && client.checklist) {
      setFormState(client.checklist);
    }
  }, [client]);

  const semaforo = getClientTrafficLightStatus(formState);

  const toggleCheck = (field) => {
    setFormState(prev => {
      const currentVal = prev[field] || {};
      const nextChecked = !currentVal.checked;
      let nextCurrent = currentVal.current || 0;
      let nextTarget = currentVal.target || 1;
      
      // If manually checked, auto-fill current count to target if 0
      if (nextChecked && nextCurrent < nextTarget) {
        nextCurrent = nextTarget;
      } else if (!nextChecked && nextCurrent === nextTarget) {
        nextCurrent = 0;
      }

      return {
        ...prev,
        [field]: {
          ...currentVal,
          checked: nextChecked,
          current: nextCurrent,
          target: nextTarget
        }
      };
    });
  };

  const updateCount = (field, key, val) => {
    const numVal = Math.max(0, parseInt(val, 10) || 0);
    setFormState(prev => {
      const currentObj = prev[field] || { checked: false, current: 0, target: 1 };
      const nextObj = { ...currentObj, [key]: numVal };
      
      // Auto update checked state if current reaches or exceeds target
      if (nextObj.target > 0 && nextObj.current >= nextObj.target) {
        nextObj.checked = true;
      } else if (key === 'current' && nextObj.current < nextObj.target) {
        nextObj.checked = false;
      }

      return {
        ...prev,
        [field]: nextObj
      };
    });
  };

  const handleAdsChange = (rating) => {
    setFormState(prev => ({
      ...prev,
      adsRating: rating
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveChecklist(client.id, formState);
      onClose();
    } catch (err) {
      console.error('Error saving checklist', err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpand = (sec) => {
    setExpandedSection(expandedSection === sec ? null : sec);
  };

  return (
    <div className="checklist-modal-overlay" onClick={onClose}>
      <div className="checklist-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="checklist-modal-header">
          <div className="checklist-client-title">
            <h2>{client.name}</h2>
            <span className="checklist-client-subtitle">Perfil y Checklists de Control</span>
          </div>

          <button className="checklist-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Semáforo & Status Indicator Banner */}
        <div className="checklist-status-banner" style={{ background: semaforo.bg, borderColor: semaforo.badgeBorder }}>
          <div className="checklist-status-info">
            <div className="checklist-badge" style={{ background: semaforo.color, color: '#FFFFFF' }}>
              {semaforo.statusLabel}
            </div>
            <div className="checklist-status-text" style={{ color: semaforo.color }}>
              <strong>{semaforo.percentage}% Completado</strong> • ({semaforo.completedCount} de {semaforo.totalCount} requerimientos cumplidos)
            </div>
          </div>

          <div className="checklist-progress-outer">
            <div 
              className="checklist-progress-inner" 
              style={{ width: `${semaforo.percentage}%`, background: semaforo.color }} 
            />
          </div>
        </div>

        {/* Checklist Content */}
        <div className="checklist-modal-body">

          {/* 1. Carrusel */}
          <div className={`checklist-item-card ${formState.carrusel?.checked ? 'completed' : ''}`}>
            <div className="checklist-item-main">
              <label className="checklist-checkbox-wrapper">
                <input 
                  type="checkbox" 
                  checked={!!formState.carrusel?.checked} 
                  onChange={() => toggleCheck('carrusel')} 
                />
                <span className="checklist-custom-box">
                  {formState.carrusel?.checked && <CheckCircle2 size={16} color="#FFFFFF" />}
                </span>
                <span className="checklist-item-name">
                  <LayoutGrid size={16} className="checklist-icon" /> Carrusel
                </span>
              </label>

              <div className="checklist-item-counter">
                <span>{formState.carrusel?.current || 0} / {formState.carrusel?.target || 4}</span>
                <button className="checklist-expand-btn" onClick={() => toggleExpand('carrusel')}>
                  {expandedSection === 'carrusel' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {expandedSection === 'carrusel' && (
              <div className="checklist-expand-panel">
                <div className="checklist-input-group">
                  <label>Completados:</label>
                  <input 
                    type="number" 
                    value={formState.carrusel?.current ?? 0} 
                    onChange={e => updateCount('carrusel', 'current', e.target.value)}
                  />
                </div>
                <div className="checklist-input-group">
                  <label>Meta total:</label>
                  <input 
                    type="number" 
                    value={formState.carrusel?.target ?? 4} 
                    onChange={e => updateCount('carrusel', 'target', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Post */}
          <div className={`checklist-item-card ${formState.post?.checked ? 'completed' : ''}`}>
            <div className="checklist-item-main">
              <label className="checklist-checkbox-wrapper">
                <input 
                  type="checkbox" 
                  checked={!!formState.post?.checked} 
                  onChange={() => toggleCheck('post')} 
                />
                <span className="checklist-custom-box">
                  {formState.post?.checked && <CheckCircle2 size={16} color="#FFFFFF" />}
                </span>
                <span className="checklist-item-name">
                  <FileText size={16} className="checklist-icon" /> Post
                </span>
              </label>

              <div className="checklist-item-counter">
                <span>{formState.post?.current || 0} / {formState.post?.target || 12}</span>
                <button className="checklist-expand-btn" onClick={() => toggleExpand('post')}>
                  {expandedSection === 'post' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {expandedSection === 'post' && (
              <div className="checklist-expand-panel">
                <div className="checklist-input-group">
                  <label>Completados:</label>
                  <input 
                    type="number" 
                    value={formState.post?.current ?? 0} 
                    onChange={e => updateCount('post', 'current', e.target.value)}
                  />
                </div>
                <div className="checklist-input-group">
                  <label>Meta total:</label>
                  <input 
                    type="number" 
                    value={formState.post?.target ?? 12} 
                    onChange={e => updateCount('post', 'target', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Video */}
          <div className={`checklist-item-card ${formState.video?.checked ? 'completed' : ''}`}>
            <div className="checklist-item-main">
              <label className="checklist-checkbox-wrapper">
                <input 
                  type="checkbox" 
                  checked={!!formState.video?.checked} 
                  onChange={() => toggleCheck('video')} 
                />
                <span className="checklist-custom-box">
                  {formState.video?.checked && <CheckCircle2 size={16} color="#FFFFFF" />}
                </span>
                <span className="checklist-item-name">
                  <Video size={16} className="checklist-icon" /> Video
                </span>
              </label>

              <div className="checklist-item-counter">
                <span>{formState.video?.current || 0} / {formState.video?.target || 6}</span>
                <button className="checklist-expand-btn" onClick={() => toggleExpand('video')}>
                  {expandedSection === 'video' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {expandedSection === 'video' && (
              <div className="checklist-expand-panel">
                <div className="checklist-input-group">
                  <label>Completados:</label>
                  <input 
                    type="number" 
                    value={formState.video?.current ?? 0} 
                    onChange={e => updateCount('video', 'current', e.target.value)}
                  />
                </div>
                <div className="checklist-input-group">
                  <label>Meta total:</label>
                  <input 
                    type="number" 
                    value={formState.video?.target ?? 6} 
                    onChange={e => updateCount('video', 'target', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Factura Paga */}
          <div className={`checklist-item-card ${formState.facturaPaga?.checked ? 'completed' : ''}`}>
            <div className="checklist-item-main">
              <label className="checklist-checkbox-wrapper">
                <input 
                  type="checkbox" 
                  checked={!!formState.facturaPaga?.checked} 
                  onChange={() => toggleCheck('facturaPaga')} 
                />
                <span className="checklist-custom-box">
                  {formState.facturaPaga?.checked && <CheckCircle2 size={16} color="#FFFFFF" />}
                </span>
                <span className="checklist-item-name">
                  <DollarSign size={16} className="checklist-icon" /> Factura Paga
                </span>
              </label>

              <span className={`checklist-badge-status ${formState.facturaPaga?.checked ? 'paid' : 'pending'}`}>
                {formState.facturaPaga?.checked ? 'Pagada' : 'Pendiente'}
              </span>
            </div>
          </div>

          {/* 5. Ads Según Cliente */}
          <div className="checklist-ads-section">
            <div className="checklist-ads-header">
              <span className="checklist-item-name">
                <Sparkles size={16} color="#27BEA5" /> Ads Según Cliente
              </span>
              <span className="checklist-ads-current">
                Calificación: <strong>{formState.adsRating || 'Excelente'}</strong>
              </span>
            </div>

            <div className="checklist-ads-options">
              {['Excelente', 'Bueno', 'Normal', 'Malo', 'No incluido'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`checklist-ads-btn ${formState.adsRating === opt ? 'active' : ''} ${opt.toLowerCase().replace(' ', '-')}`}
                  onClick={() => handleAdsChange(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="checklist-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  );
}
