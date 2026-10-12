import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Rocket, Trash2, Edit2, Plus, Users, ListChecks, Settings, Lightbulb, CheckCircle, Sparkles, CheckSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import './TemplateDetailsModal.css';

export const TemplateDetailsModal = ({
  isOpen,
  onClose,
  activeTemplate,
  onLaunch,
  onDelete,
  saveTemplate,
  teamMembers,
  detailModalTab,
  setDetailModalTab,
  draftAssignment,
  setDraftAssignment,
  editingStepIndex,
  setEditingStepIndex,
  editingStepData,
  setEditingStepData,
  handleUpdateStep,
  handleDeleteStep,
  handleAddStep,
  expandedTemplateMembers,
  setExpandedTemplateMembers,
  setTicketModal,
  departments = []
}) => {
  const [detailChecklistInput, setDetailChecklistInput] = useState('');
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);
  const [draftLeads, setDraftLeads] = useState({});

  useEffect(() => {
    if (activeTemplate && activeTemplate.steps && teamMembers) {
      const initial = {};
      teamMembers.forEach(m => {
        initial[m.id] = (activeTemplate.steps || [])
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => {
            if (!s) return false;
            const inAssigned = Array.isArray(s.assignedTo)
              ? s.assignedTo.map(String).includes(String(m.id))
              : String(s.assignedTo) === String(m.id);
            const isLead = s.leadId && String(s.leadId) === String(m.id);
            return inAssigned || isLead;
          })
          .map(({ i }) => i);
      });
      setDraftAssignment(initial);

      const initialLeads = {};
      (activeTemplate.steps || []).forEach((s, i) => {
        if (!s) return;
        if (s.leadId && s.leadId !== 'Unassigned') {
          initialLeads[i] = String(s.leadId);
        } else {
          initialLeads[i] = '';
        }
      });
      setDraftLeads(initialLeads);
    }
  }, [activeTemplate, teamMembers, setDraftAssignment]);

  if (!isOpen || !activeTemplate) return null;

  const stepsList = (activeTemplate.steps || []).filter(Boolean);

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <motion.div
        className="w-full max-w-4xl mx-auto py-8 px-4"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="tdm-modal-card" style={{ position: 'relative' }}>
          {/* Close button inside card */}
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 20 }}>
            <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
          </div>

          {/* Header */}
          <div className="tdm-header" style={{ paddingRight: '3.5rem' }}>
            <div style={{ flex: 1 }}>
              <div className="tdm-header-info">
                <span className="tdm-header-avatar">{activeTemplate.companionAvatar || <Settings size={24}/>}</span>
                <div>
                  <h2 className="tdm-header-title">{activeTemplate.title}</h2>
                  <p className="tdm-header-desc">{activeTemplate.description}</p>
                </div>
              </div>
              <div className="tdm-meta-row">
                <span className="tdm-meta-badge secondary">
                  Duración: {activeTemplate.durationDays} días
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Categoría:</span>
                  {departments.length > 0 ? (
                    <select
                      value={activeTemplate.category || ''}
                      onChange={(e) => saveTemplate({ ...activeTemplate, category: e.target.value })}
                      className="tdm-category-input"
                      style={{ 
                        height: 'auto', 
                        padding: '0.25rem 2rem 0.25rem 0.5rem',
                        appearance: 'none',
                        backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(0,0,0,0.5)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.5rem center',
                        backgroundSize: '0.8em',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#334155',
                        width: '150px',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="">Seleccionar área...</option>
                      {departments.map((dept, idx) => (
                        <option key={idx} value={dept}>{dept}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text"
                      value={activeTemplate.category || ''} 
                      onChange={(e) => saveTemplate({ ...activeTemplate, category: e.target.value })} 
                      className="tdm-category-input"
                      placeholder="Ej. Operaciones"
                    />
                  )}
                </div>
              </div>
            </div>
            
            <div className="tdm-header-actions">
              {(!activeTemplate.status || activeTemplate.status === 'approved') && (
                <button onClick={onLaunch} className="tdm-btn-launch">
                  <Rocket size={16} /> Iniciar Ejecución
                </button>
              )}
              <button onClick={() => onDelete(activeTemplate.id)} className="tdm-btn-delete">
                <Trash2 size={16} /> Eliminar Plantilla
              </button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="tdm-tabs-container">
            <button 
              className={`tdm-tab-trigger ${detailModalTab === 'steps' ? 'active' : ''}`}
              onClick={() => setDetailModalTab('steps')}
            >
              <ListChecks size={18} /> Pasos del Proceso
            </button>
            <button 
              className={`tdm-tab-trigger ${detailModalTab === 'team' ? 'active' : ''}`}
              onClick={() => {
                setDetailModalTab('team');
                const initial = {};
                teamMembers.forEach(m => {
                  initial[m.id] = (activeTemplate.steps || [])
                    .map((s, i) => ({ s, i }))
                    .filter(({ s }) => {
                      if (!s) return false;
                      const inAssigned = Array.isArray(s.assignedTo)
                        ? s.assignedTo.map(String).includes(String(m.id))
                        : String(s.assignedTo) === String(m.id);
                      const isLead = s.leadId && String(s.leadId) === String(m.id);
                      return inAssigned || isLead;
                    })
                    .map(({ i }) => i);
                });
                setDraftAssignment(initial);

                const initialLeads = {};
                (activeTemplate.steps || []).forEach((s, i) => {
                  if (!s) return;
                  if (s.leadId && s.leadId !== 'Unassigned') {
                    initialLeads[i] = String(s.leadId);
                  } else {
                    initialLeads[i] = '';
                  }
                });
                setDraftLeads(initialLeads);
              }}
            >
              <Users size={18} /> Asignación del Equipo
            </button>
          </div>

          {/* Modal Tab Content */}
          <div className="tdm-content">
            {detailModalTab === 'steps' ? (
              <div className="tdm-steps-list">
                {stepsList.map((step, idx) => {
                  const isEditing = editingStepIndex === idx;

                  return (
                    <div key={idx} className="tdm-step-card-wrapper">
                      <div className="tdm-step-number">
                        {idx + 1}
                      </div>
                      
                      <div className="tdm-step-card">
                        {isEditing ? (
                          <div className="tdm-step-edit-form">
                            <div className="tdm-form-row">
                              <div className="tdm-form-group">
                                <label>Título del Paso</label>
                                <input 
                                  type="text"
                                  value={editingStepData.title}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, title: e.target.value })}
                                />
                              </div>
                              <div className="tdm-form-group">
                                <label>Día relativo</label>
                                <input 
                                  type="number" 
                                  value={editingStepData.relativeOffsetDays}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, relativeOffsetDays: parseInt(e.target.value) || 1 })}
                                  min="1"
                                />
                              </div>
                            </div>

                            <div className="tdm-form-group">
                              <label>Descripción del paso</label>
                              <textarea 
                                rows={3}
                                value={editingStepData.description}
                                onChange={(e) => setEditingStepData({ ...editingStepData, description: e.target.value })}
                              />
                            </div>

                            <div className="tdm-form-row">
                              <div className="tdm-form-group">
                                <label>Tipo de Acción</label>
                                <select 
                                  value={editingStepData.type}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, type: e.target.value })}
                                >
                                  <option value="manual">Paso Manual (Checkbox)</option>
                                  <option value="digital">Acción Digital (Archivo)</option>
                                </select>
                              </div>
                              <div className="tdm-form-group">
                                <label>Mensaje Motivador</label>
                                <input 
                                  type="text"
                                  value={editingStepData.motivation}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, motivation: e.target.value })}
                                />
                              </div>
                            </div>

                            {editingStepData.type === 'digital' && (
                              <div className="tdm-form-group">
                                <label>📁 Subcarpeta en Google Drive (opcional)</label>
                                <input
                                  type="text"
                                  placeholder="Ej. Legal  ó  Contratos/Firmados"
                                  value={editingStepData.driveSubfolder || ''}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, driveSubfolder: e.target.value })}
                                />
                                <small style={{ color: '#64748B', fontSize: '0.72rem' }}>
                                  El archivo de este paso se guardará en esta subcarpeta, dentro de la carpeta de la ejecución. Vacío = configuración del Workspace.
                                </small>
                              </div>
                            )}

                            {/* Encargado del Paso + Equipo Asignado (Múltiple) */}
                            <div className="tdm-form-group" style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                              <div style={{ marginBottom: '0.75rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                                  👑 Encargado Principal del Paso (Elige libremente quién lidera este paso)
                                </label>
                                <select
                                  value={editingStepData.leadId ? String(editingStepData.leadId) : ''}
                                  onChange={(e) => {
                                    const newLeadId = e.target.value;
                                    const currentAssigned = Array.isArray(editingStepData.assignedTo)
                                      ? editingStepData.assignedTo.map(String)
                                      : (editingStepData.assignedTo && editingStepData.assignedTo !== 'Unassigned' ? [String(editingStepData.assignedTo)] : []);
                                    const updatedAssigned = newLeadId && !currentAssigned.includes(String(newLeadId))
                                      ? [...currentAssigned, String(newLeadId)]
                                      : currentAssigned;
                                    setEditingStepData({
                                      ...editingStepData,
                                      leadId: newLeadId,
                                      assignedTo: updatedAssigned
                                    });
                                  }}
                                  style={{ width: '100%', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0.45rem 0.65rem', fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}
                                >
                                  <option value="">-- Seleccionar Encargado Principal --</option>
                                  {teamMembers.map(m => (
                                    <option key={m.id} value={String(m.id)}>
                                      {m.name} ({m.role}{m.department ? ` · ${m.department}` : ''})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                                <span>👥 Colaboradores Asignados (Marca varios y haz clic en "👑 Elegir como Principal" en quien quieras)</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#0D9488' }}>
                                  {(() => {
                                    const list = Array.isArray(editingStepData.assignedTo)
                                      ? editingStepData.assignedTo.map(String)
                                      : (editingStepData.assignedTo && editingStepData.assignedTo !== 'Unassigned' ? [String(editingStepData.assignedTo)] : []);
                                    return `${list.length} asignado${list.length !== 1 ? 's' : ''}`;
                                  })()}
                                </span>
                              </label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #E2E8F0', padding: '10px', borderRadius: '8px', maxHeight: '190px', overflowY: 'auto', background: '#FFFFFF' }}>
                                {teamMembers.map(m => {
                                  const currentAssigned = Array.isArray(editingStepData.assignedTo)
                                    ? editingStepData.assignedTo.map(String)
                                    : (editingStepData.assignedTo && editingStepData.assignedTo !== 'Unassigned' ? [String(editingStepData.assignedTo)] : []);
                                  const explicitLeadId = editingStepData.leadId ? String(editingStepData.leadId) : '';
                                  const isLead = explicitLeadId === String(m.id);
                                  const isChecked = currentAssigned.includes(String(m.id)) || isLead;

                                  return (
                                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: '8px', background: isLead ? '#F0FDFA' : (isChecked ? '#F8FAFC' : 'transparent'), border: isLead ? '1px solid #0D9488' : (isChecked ? '1px solid #E2E8F0' : '1px solid transparent') }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', margin: 0, flex: 1 }}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            let updatedList;
                                            let nextLeadId = explicitLeadId;
                                            if (e.target.checked) {
                                              updatedList = Array.from(new Set([...currentAssigned, String(m.id)]));
                                            } else {
                                              updatedList = currentAssigned.filter(id => id !== String(m.id));
                                              if (nextLeadId === String(m.id)) {
                                                nextLeadId = '';
                                              }
                                            }
                                            setEditingStepData({
                                              ...editingStepData,
                                              leadId: nextLeadId,
                                              assignedTo: updatedList
                                            });
                                          }}
                                          style={{ cursor: 'pointer', margin: 0, accentColor: '#0D9488' }}
                                        />
                                        <span style={{ color: '#0F172A', fontWeight: isChecked ? 600 : 400 }}>
                                          {m.name} <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 400 }}>({m.role})</span>
                                        </span>
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isLead) {
                                            // Unmark as principal
                                            setEditingStepData({ ...editingStepData, leadId: '' });
                                          } else {
                                            // Mark as principal and ensure they are in assignedTo
                                            const updatedList = Array.from(new Set([...currentAssigned, String(m.id)]));
                                            setEditingStepData({
                                              ...editingStepData,
                                              leadId: String(m.id),
                                              assignedTo: updatedList
                                            });
                                          }
                                        }}
                                        style={{
                                          fontSize: '0.7rem',
                                          fontWeight: 700,
                                          background: isLead ? '#0D9488' : '#FFFFFF',
                                          color: isLead ? '#FFFFFF' : '#475569',
                                          border: isLead ? '1px solid #0D9488' : '1px solid #CBD5E1',
                                          padding: '3px 9px',
                                          borderRadius: '999px',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease'
                                        }}
                                        title={isLead ? 'Clic para quitar como Encargado Principal' : 'Marcar como Encargado Principal de este paso'}
                                      >
                                        {isLead ? '👑 Encargado Principal' : '👑 Elegir como Principal'}
                                      </button>
                                    </div>
                                  );
                                })}
                                {teamMembers.length === 0 && (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay colaboradores registrados.</span>
                                )}
                              </div>
                            </div>

                            {/* Client Email Notification Trigger */}
                            <div className="tdm-form-group" style={{ marginTop: '0.5rem', background: '#F0FDFA', padding: '0.85rem', borderRadius: '10px', border: '1px solid #CCFBF1' }}>
                              <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#0F766E' }}>
                                <input
                                  type="checkbox"
                                  checked={!!editingStepData.notifyClientEmail}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, notifyClientEmail: e.target.checked })}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0D9488' }}
                                />
                                <span>📧 Notificar automáticamente al cliente por correo al completar este paso</span>
                              </label>
                              <p style={{ margin: '4px 0 0 24px', fontSize: '0.75rem', color: '#115E59' }}>
                                Cuando el operador complete este paso, el sistema enviará un correo con el progreso o solicitando acción al email registrado del cliente.
                              </p>

                              {editingStepData.notifyClientEmail && (
                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '24px' }}>
                                  <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0F766E', display: 'block', marginBottom: '2px' }}>Asunto Personalizado (Opcional):</label>
                                    <input
                                      type="text"
                                      placeholder={`Actualización: ${editingStepData.title || 'Paso completado'}`}
                                      value={editingStepData.clientEmailSubject || ''}
                                      onChange={(e) => setEditingStepData({ ...editingStepData, clientEmailSubject: e.target.value })}
                                      style={{ width: '100%', background: '#FFFFFF', border: '1px solid #99F6E4', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0F766E', display: 'block', marginBottom: '2px' }}>Mensaje / Indicaciones para el cliente (Opcional):</label>
                                    <textarea
                                      rows={2}
                                      placeholder="Ej. Hemos completado este hito. Por favor revisa la plataforma o facilítanos el siguiente documento para continuar."
                                      value={editingStepData.clientEmailBody || ''}
                                      onChange={(e) => setEditingStepData({ ...editingStepData, clientEmailBody: e.target.value })}
                                      style={{ width: '100%', background: '#FFFFFF', border: '1px solid #99F6E4', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Checklist Section in Step Editor */}
                            <div className="tdm-form-group" style={{ marginTop: '0.5rem', background: '#F8FAFC', padding: '0.85rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                                  <ListChecks size={15} color="#27BEA5" /> Checklist / Sub-tareas del Paso ({(editingStepData.checklist || []).length})
                                </label>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setIsSuggestingAI(true);
                                    try {
                                      const res = await fetch('/api/ai/suggest-step-checklist', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                                        },
                                        body: JSON.stringify({ title: editingStepData.title, description: editingStepData.description })
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        if (Array.isArray(data.checklist)) {
                                          const currentList = editingStepData.checklist || [];
                                          const newItems = data.checklist.map((t, cIdx) => ({
                                            id: `chk_${Date.now()}_${cIdx}`,
                                            text: typeof t === 'string' ? t : (t.text || String(t)),
                                            isCompleted: false
                                          }));
                                          setEditingStepData({
                                            ...editingStepData,
                                            checklist: [...currentList, newItems].flat()
                                          });
                                        }
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    } finally {
                                      setIsSuggestingAI(false);
                                    }
                                  }}
                                  disabled={isSuggestingAI}
                                  style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #27BEA5',
                                    color: '#27BEA5',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Sparkles size={12} /> {isSuggestingAI ? 'Analizando...' : 'Sugerir con IA'}
                                </button>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {(editingStepData.checklist || []).map((item, itemIdx) => (
                                  <div key={item.id || itemIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                    <CheckSquare size={13} color="#27BEA5" />
                                    <span style={{ flex: 1, fontSize: '0.8rem', color: '#1E293B' }}>{item.text || item}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (editingStepData.checklist || []).filter((_, i) => i !== itemIdx);
                                        setEditingStepData({ ...editingStepData, checklist: updated });
                                      }}
                                      style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))}

                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                  <input
                                    type="text"
                                    placeholder="Añadir verificación o sub-tarea..."
                                    value={detailChecklistInput}
                                    onChange={e => setDetailChecklistInput(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (detailChecklistInput.trim()) {
                                          const currentList = editingStepData.checklist || [];
                                          setEditingStepData({
                                            ...editingStepData,
                                            checklist: [...currentList, { id: `chk_${Date.now()}`, text: detailChecklistInput.trim(), isCompleted: false }]
                                          });
                                          setDetailChecklistInput('');
                                        }
                                      }
                                    }}
                                    style={{ flex: 1, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.8rem', outline: 'none' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (detailChecklistInput.trim()) {
                                        const currentList = editingStepData.checklist || [];
                                        setEditingStepData({
                                          ...editingStepData,
                                          checklist: [...currentList, { id: `chk_${Date.now()}`, text: detailChecklistInput.trim(), isCompleted: false }]
                                        });
                                        setDetailChecklistInput('');
                                      }
                                    }}
                                    disabled={!detailChecklistInput.trim()}
                                    style={{ background: '#27BEA5', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '0.35rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    <Plus size={13} /> Añadir
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="tdm-form-actions">
                              <button className="tdm-btn-cancel-step" onClick={() => setEditingStepIndex(null)}>
                                Cancelar
                              </button>
                              <button 
                                className="tdm-btn-save-step"
                                onClick={() => {
                                  handleUpdateStep(activeTemplate.id, idx, editingStepData);
                                  setEditingStepIndex(null);
                                }}
                              >
                                Guardar Paso
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="tdm-step-header">
                              <div>
                                <h4 className="tdm-step-title-text">{step.title}</h4>
                                <span className="tdm-step-offset">
                                  Límite estimado: {step.durationLabel} (+{step.relativeOffsetDays}d)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-xs font-bold px-2 py-1 rounded-full",
                                  step.type === 'digital' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                                )}>
                                  {step.type === 'digital' ? 'Acción Digital' : 'Paso Manual'}
                                </span>
                                <button className="tdm-icon-btn" onClick={() => {
                                  setEditingStepIndex(idx);
                                  setEditingStepData(step);
                                }}>
                                  <Edit2 size={14} />
                                </button>
                                <button className="tdm-icon-btn delete" onClick={() => handleDeleteStep(activeTemplate.id, idx)}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            
                            <p className="tdm-step-desc">{step.description}</p>
                            
                            <div className="tdm-step-footer">
                              <div className="tdm-motivation-tag">
                                <Lightbulb size={16} className="inline-block mr-1"/> {step.motivation}
                              </div>
                              {(step.assignedTo || step.leadId) && (
                                <div className="tdm-assignee-tag" style={{ flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                                  {(() => {
                                    const rawAssigned = Array.isArray(step.assignedTo)
                                      ? step.assignedTo.map(String)
                                      : (step.assignedTo && step.assignedTo !== 'Unassigned' ? [String(step.assignedTo)] : []);
                                    const explicitLeadId = step.leadId && step.leadId !== 'Unassigned' ? String(step.leadId) : '';
                                    const allIds = Array.from(new Set([...(explicitLeadId ? [explicitLeadId] : []), ...rawAssigned]));
                                    const members = teamMembers.filter(m => allIds.includes(String(m.id)));

                                    if (members.length === 0) return null;

                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                                          {members.map(m => {
                                            const isLead = explicitLeadId === String(m.id);
                                            return (
                                              <span
                                                key={m.id}
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '6px',
                                                  background: isLead ? '#CCFBF1' : '#F1F5F9',
                                                  color: isLead ? '#0F766E' : '#334155',
                                                  padding: '3px 10px',
                                                  borderRadius: '999px',
                                                  fontSize: '0.76rem',
                                                  fontWeight: isLead ? 700 : 600,
                                                  border: isLead ? '1px solid #0D9488' : '1px solid #E2E8F0'
                                                }}
                                              >
                                                <span>{isLead ? `👑 Encargado: ${m.name}` : `👤 ${m.name}`}</span>
                                                {!isLead && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      handleUpdateStep(activeTemplate.id, idx, {
                                                        ...step,
                                                        leadId: String(m.id),
                                                        assignedTo: allIds
                                                      });
                                                    }}
                                                    style={{
                                                      background: '#FFFFFF',
                                                      border: '1px solid #CBD5E1',
                                                      borderRadius: '999px',
                                                      padding: '1px 7px',
                                                      fontSize: '0.68rem',
                                                      fontWeight: 700,
                                                      color: '#0F766E',
                                                      cursor: 'pointer'
                                                    }}
                                                    title={`Cambiar a ${m.name} como Encargado Principal de este paso`}
                                                  >
                                                    👑 Hacer Principal
                                                  </button>
                                                )}
                                              </span>
                                            );
                                          })}
                                        </div>
                                        {!explicitLeadId && members.length > 0 && (
                                          <span style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 600 }}>
                                            💡 Haz clic en "👑 Hacer Principal" sobre quien quieras como Encargado Principal de este paso.
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {step.checklist && step.checklist.length > 0 && (
                                <div style={{ marginTop: '0.6rem', padding: '0.6rem 0.8rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                    <ListChecks size={13} color="#27BEA5" /> Checklist de Verificación ({step.checklist.length}):
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {step.checklist.map((item, cIdx) => (
                                      <div key={item.id || cIdx} style={{ fontSize: '0.78rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#27BEA5', flexShrink: 0 }} />
                                        <span>{item.text || item}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button 
                  className="tdm-add-step-btn"
                  onClick={() => handleAddStep(activeTemplate.id)}
                >
                  <Plus size={16} /> Agregar Nuevo Paso
                </button>
              </div>
            ) : (
              <div>
                <p className="tdm-team-instruction">
                  Activa o desactiva con el toggle cada paso donde el miembro interviene (pueden asignarse <strong>varios miembros al mismo paso</strong>) y marca libremente con el botón <strong>"👑 Elegir como Principal"</strong> quién deseas que sea el Encargado Principal de cada paso.
                </p>

                {teamMembers.length === 0 ? (
                  <div className="tdm-team-empty">
                    <p>No hay miembros de equipo registrados. Ve a la pestaña de "Equipo" para agregarlos.</p>
                  </div>
                ) : (
                  <div className="tdm-member-list">
                    {teamMembers.map(member => {
                      const draftSteps = draftAssignment[member.id] || [];
                      const isInvolved = draftSteps.length > 0;
                      const leadCount = Object.entries(draftLeads).filter(([sIdx, lId]) => String(lId) === String(member.id) && draftSteps.includes(Number(sIdx))).length;

                      return (
                        <div key={member.id} className={`tdm-member-card ${isInvolved ? 'involved' : ''}`}>
                          <div className="tdm-member-card-body">
                            <div className="tdm-member-header">
                              <div className="tdm-member-avatar">
                                {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="tdm-member-info">
                                <h4 className="tdm-member-name">{member.name}</h4>
                                <p className="tdm-member-role">
                                  {member.role}{member.department ? ` · ${member.department}` : ''}
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {leadCount > 0 && (
                                  <span className="tdm-badge" style={{ background: '#CCFBF1', color: '#0F766E' }}>
                                    👑 Principal en {leadCount}
                                  </span>
                                )}
                                {isInvolved && (
                                  <span className="tdm-badge">
                                    {draftSteps.length} paso{draftSteps.length !== 1 ? 's' : ''} asignado{draftSteps.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="tdm-toggle-container">
                              <button 
                                type="button"
                                className="tdm-toggle-btn"
                                onClick={() => setExpandedTemplateMembers(prev => ({ ...prev, [member.id]: !prev[member.id] }))}
                              >
                                {expandedTemplateMembers[member.id] ? 'Ocultar pasos' : 'Ver y asignar pasos'}
                                <span style={{ transform: expandedTemplateMembers[member.id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </span>
                              </button>
                            </div>

                            {expandedTemplateMembers[member.id] && (
                              <div className="tdm-steps-container">
                                {stepsList.map((step, sIdx) => {
                                  const isOn = draftSteps.includes(sIdx);
                                  const otherAssignees = teamMembers.filter(m =>
                                    m.id !== member.id &&
                                    (draftAssignment[m.id] || []).includes(sIdx)
                                  );
                                  const currentStepLeadId = draftLeads[sIdx] ? String(draftLeads[sIdx]) : '';
                                  const isStepLead = currentStepLeadId === String(member.id);
                                  const leadMemberObj = teamMembers.find(m => String(m.id) === currentStepLeadId);

                                  return (
                                    <div
                                      key={sIdx}
                                      className={`tdm-step-row ${isOn ? 'on' : ''}`}
                                      style={{ flexWrap: 'wrap', gap: '8px' }}
                                    >
                                      <span className="tdm-step-row-title" style={{ flex: 1, minWidth: '200px' }}>
                                        <strong>Paso {sIdx + 1}:</strong> {step.title}
                                        {(otherAssignees.length > 0 || leadMemberObj) && (
                                          <em style={{ display: 'block', fontSize: '0.73rem', color: '#64748B', fontStyle: 'normal', marginTop: '2px' }}>
                                            {leadMemberObj ? `👑 Principal actual: ${leadMemberObj.name}` : '⚠️ Sin encargado principal aún'}
                                            {otherAssignees.length > 0 ? ` · 👥 Asignados: ${otherAssignees.map(o => o.name).join(', ')}` : ''}
                                          </em>
                                        )}
                                      </span>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (isStepLead) {
                                              setDraftLeads(prev => ({
                                                ...prev,
                                                [sIdx]: ''
                                              }));
                                            } else {
                                              // Mark this member as Principal AND ensure they are toggled ON in draftAssignment
                                              setDraftLeads(prev => ({
                                                ...prev,
                                                [sIdx]: String(member.id)
                                              }));
                                              if (!isOn) {
                                                setDraftAssignment(prev => {
                                                  const current = prev[member.id] || [];
                                                  return { ...prev, [member.id]: [...current, sIdx] };
                                                });
                                              }
                                            }
                                          }}
                                          style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            padding: '4px 10px',
                                            borderRadius: '999px',
                                            cursor: 'pointer',
                                            border: isStepLead ? '1px solid #0D9488' : '1px solid #CBD5E1',
                                            background: isStepLead ? '#0D9488' : '#FFFFFF',
                                            color: isStepLead ? '#FFFFFF' : '#475569',
                                            transition: 'all 0.15s ease'
                                          }}
                                          title={isStepLead ? 'Clic para desmarcar como Encargado Principal' : `Marcar a ${member.name} como Encargado Principal de este paso`}
                                        >
                                          {isStepLead ? '👑 Encargado Principal' : '👑 Elegir como Principal'}
                                        </button>

                                        <div className="tdm-step-toggle">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (isOn) return;
                                              setDraftAssignment(prev => {
                                                const current = prev[member.id] || [];
                                                return { ...prev, [member.id]: [...current, sIdx] };
                                              });
                                            }}
                                            className={`tdm-btn-yes ${isOn ? 'active' : ''}`}
                                          >Sí</button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (!isOn) return;
                                              const nextDraftForMember = (draftAssignment[member.id] || []).filter(i => i !== sIdx);
                                              setDraftAssignment(prev => ({
                                                ...prev,
                                                [member.id]: nextDraftForMember
                                              }));
                                              if (String(draftLeads[sIdx]) === String(member.id)) {
                                                setDraftLeads(prev => ({
                                                  ...prev,
                                                  [sIdx]: ''
                                                }));
                                              }
                                            }}
                                            className={`tdm-btn-no ${!isOn ? 'active' : ''}`}
                                          >No</button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <button
                              type="button"
                              className="tdm-save-btn"
                              onClick={async () => {
                                const newSteps = stepsList.map((s, sIdx) => {
                                  // Build full assignedTo list from draftAssignment across all teamMembers
                                  const assignedForStep = teamMembers
                                    .filter(m => (draftAssignment[m.id] || []).includes(sIdx))
                                    .map(m => String(m.id));
                                  let stepLeadId = draftLeads[sIdx] ? String(draftLeads[sIdx]) : '';
                                  if (stepLeadId && !assignedForStep.includes(stepLeadId)) {
                                    assignedForStep.push(stepLeadId);
                                  }
                                  return {
                                    ...s,
                                    leadId: stepLeadId,
                                    assignedTo: assignedForStep
                                  };
                                });
                                await saveTemplate({ ...activeTemplate, steps: newSteps });
                                onClose();
                                setTicketModal({
                                  isOpen: true,
                                  title: "¡Asignación Guardada!",
                                  message: `Se actualizaron los encargados principales y colaboradores asignados en la plantilla "${activeTemplate.title}".`,
                                  ticketId: "Asignación de Equipo",
                                  customFields: [
                                    { label: "Colaborador", value: member.name },
                                    { label: "Plantilla", value: activeTemplate.title }
                                  ]
                                });
                              }}
                            >
                              <CheckCircle size={18} className="inline-block mr-2"/> Confirmar asignación de {member.name}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
