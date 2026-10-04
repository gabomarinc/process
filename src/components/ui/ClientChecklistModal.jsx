import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Plus, 
  Sliders, 
  Sparkles,
  LayoutGrid, 
  FileText, 
  Video, 
  DollarSign, 
  CheckSquare, 
  Hash, 
  Star 
} from 'lucide-react';
import { normalizeChecklistItems, getClientTrafficLightStatus } from '../../utils/clientSemaforo';
import './ClientChecklistModal.css';

export default function ClientChecklistModal({
  isOpen,
  onClose,
  client,
  onSaveChecklist
}) {
  if (!isOpen || !client) return null;

  const [items, setItems] = useState(() => normalizeChecklistItems(client.checklist));
  const [expandedSection, setExpandedSection] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // New Item Creator State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('boolean'); // 'boolean' | 'counter' | 'rating'
  const [newItemTarget, setNewItemTarget] = useState(4);

  useEffect(() => {
    if (client) {
      setItems(normalizeChecklistItems(client.checklist));
    }
  }, [client]);

  const semaforo = getClientTrafficLightStatus({ items });

  // Toggle boolean item or counter item
  const handleToggleCheck = (itemId) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const nextChecked = !item.checked;
      let nextCurrent = item.current || 0;
      const target = item.target || 1;

      if (item.type === 'counter') {
        if (nextChecked && nextCurrent < target) {
          nextCurrent = target;
        } else if (!nextChecked && nextCurrent === target) {
          nextCurrent = 0;
        }
        return { ...item, checked: nextChecked, current: nextCurrent };
      }

      return { ...item, checked: nextChecked };
    }));
  };

  // Update counter item values
  const handleUpdateCount = (itemId, key, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updated = { ...item, [key]: num };
      const target = key === 'target' ? num : (item.target || 1);
      const current = key === 'current' ? num : (item.current || 0);

      if (target > 0 && current >= target) {
        updated.checked = true;
      } else if (key === 'current' && current < target) {
        updated.checked = false;
      }

      return updated;
    }));
  };

  // Change rating for rating items
  const handleRatingChange = (itemId, rating) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, rating };
    }));
  };

  // Delete an item
  const handleDeleteItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Add a new dynamic item
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem = {
      id: 'item_' + Date.now(),
      name: newItemName.trim(),
      type: newItemType
    };

    if (newItemType === 'boolean') {
      newItem.checked = false;
    } else if (newItemType === 'counter') {
      newItem.checked = false;
      newItem.current = 0;
      newItem.target = Math.max(1, parseInt(newItemTarget, 10) || 1);
    } else if (newItemType === 'rating') {
      newItem.rating = 'Excelente';
    }

    setItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemTarget(4);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveChecklist(client.id, { items });
      onClose();
    } catch (err) {
      console.error('Error saving checklist', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getItemIcon = (item) => {
    const nameLower = (item.name || '').toLowerCase();
    if (nameLower.includes('video') || nameLower.includes('reel')) return <Video size={16} className="checklist-icon" />;
    if (nameLower.includes('post')) return <FileText size={16} className="checklist-icon" />;
    if (nameLower.includes('carrusel')) return <LayoutGrid size={16} className="checklist-icon" />;
    if (nameLower.includes('factura') || nameLower.includes('pago')) return <DollarSign size={16} className="checklist-icon" />;
    if (item.type === 'counter') return <Hash size={16} className="checklist-icon" />;
    if (item.type === 'rating') return <Star size={16} className="checklist-icon" />;
    return <CheckSquare size={16} className="checklist-icon" />;
  };

  return (
    <div className="checklist-modal-overlay" onClick={onClose}>
      <div className="checklist-modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="checklist-modal-header">
          <div className="checklist-client-title">
            <h2>{client.name}</h2>
            <span className="checklist-client-subtitle">Configuración y Checklist Dinámico</span>
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
              <strong>{semaforo.percentage}% Completado</strong> • ({semaforo.completedCount} de {semaforo.totalCount} cumplidos)
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
          
          <div className="checklist-section-header">
            <span className="checklist-section-title">Requerimientos del Cliente</span>
            <button 
              type="button" 
              className="checklist-add-trigger-btn"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus size={14} /> {showAddForm ? 'Cerrar' : 'Agregar Elemento'}
            </button>
          </div>

          {/* New Item Form Panel */}
          {showAddForm && (
            <form onSubmit={handleAddItem} className="checklist-new-item-panel">
              <div className="checklist-new-item-row">
                <input
                  type="text"
                  placeholder="Nombre (ej. Reels, Historias, Brief Aprobado...)"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="checklist-input-text"
                  autoFocus
                />
              </div>

              <div className="checklist-new-item-row type-select-row">
                <div className="checklist-type-selector">
                  <label className={`type-chip ${newItemType === 'boolean' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="itemType" 
                      value="boolean" 
                      checked={newItemType === 'boolean'} 
                      onChange={() => setNewItemType('boolean')} 
                    />
                    ☑️ Checkbox Simple
                  </label>
                  <label className={`type-chip ${newItemType === 'counter' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="itemType" 
                      value="counter" 
                      checked={newItemType === 'counter'} 
                      onChange={() => setNewItemType('counter')} 
                    />
                    🔢 Contador con Meta
                  </label>
                  <label className={`type-chip ${newItemType === 'rating' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="itemType" 
                      value="rating" 
                      checked={newItemType === 'rating'} 
                      onChange={() => setNewItemType('rating')} 
                    />
                    ⭐️ Calificación / Estado
                  </label>
                </div>

                {newItemType === 'counter' && (
                  <div className="checklist-target-input">
                    <label>Meta:</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={newItemTarget} 
                      onChange={e => setNewItemTarget(e.target.value)} 
                    />
                  </div>
                )}
              </div>

              <div className="checklist-new-item-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={!newItemName.trim()}>
                  Guardar Elemento
                </button>
              </div>
            </form>
          )}

          {/* Dynamic Items List */}
          {items.map((item) => {
            const isDone = item.type === 'counter' 
              ? (item.checked || (item.target > 0 && item.current >= item.target))
              : item.type === 'rating'
                ? (item.rating === 'Excelente' || item.rating === 'Bueno')
                : !!item.checked;

            return (
              <div 
                key={item.id} 
                className={`checklist-item-card ${isDone ? 'completed' : ''} ${item.type}`}
              >
                {/* 1. Boolean or Counter Item */}
                {item.type !== 'rating' ? (
                  <>
                    <div className="checklist-item-main">
                      <label className="checklist-checkbox-wrapper">
                        <input 
                          type="checkbox" 
                          checked={isDone} 
                          onChange={() => handleToggleCheck(item.id)} 
                        />
                        <span className="checklist-custom-box">
                          {isDone && <CheckCircle2 size={16} color="#FFFFFF" />}
                        </span>
                        <span className="checklist-item-name">
                          {getItemIcon(item)} {item.name}
                        </span>
                      </label>

                      <div className="checklist-item-actions-right">
                        {item.type === 'counter' && (
                          <div className="checklist-item-counter">
                            <span>{item.current || 0} / {item.target || 1}</span>
                            <button 
                              type="button"
                              className="checklist-expand-btn" 
                              onClick={() => setExpandedSection(expandedSection === item.id ? null : item.id)}
                            >
                              {expandedSection === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        )}

                        <button 
                          type="button" 
                          className="checklist-delete-item-btn" 
                          onClick={() => handleDeleteItem(item.id)}
                          title="Eliminar elemento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {item.type === 'counter' && expandedSection === item.id && (
                      <div className="checklist-expand-panel">
                        <div className="checklist-input-group">
                          <label>Completados:</label>
                          <input 
                            type="number" 
                            min="0"
                            value={item.current ?? 0} 
                            onChange={e => handleUpdateCount(item.id, 'current', e.target.value)}
                          />
                        </div>
                        <div className="checklist-input-group">
                          <label>Meta total:</label>
                          <input 
                            type="number" 
                            min="1"
                            value={item.target ?? 1} 
                            onChange={e => handleUpdateCount(item.id, 'target', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* 2. Rating / Option Item */
                  <div className="checklist-rating-container">
                    <div className="checklist-rating-header">
                      <span className="checklist-item-name">
                        {getItemIcon(item)} {item.name}
                      </span>
                      <div className="checklist-item-actions-right">
                        <span className="checklist-rating-selected-badge">
                          {item.rating || 'Excelente'}
                        </span>
                        <button 
                          type="button" 
                          className="checklist-delete-item-btn" 
                          onClick={() => handleDeleteItem(item.id)}
                          title="Eliminar elemento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="checklist-ads-options">
                      {['Excelente', 'Bueno', 'Normal', 'Malo', 'No incluido'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`checklist-ads-btn ${item.rating === opt ? 'active' : ''} ${opt.toLowerCase().replace(' ', '-')}`}
                          onClick={() => handleRatingChange(item.id, opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="checklist-empty-state">
              <p>No hay elementos en el checklist de este cliente.</p>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setItems(normalizeChecklistItems(null))}
              >
                Cargar plantilla predeterminada
              </button>
            </div>
          )}

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
