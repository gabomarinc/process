import React, { useState } from 'react';
import { X, Check, Clock, AlertCircle, Upload, FileCheck } from 'lucide-react';

export const ActiveExecutionModal = ({
  isOpen,
  onClose,
  activeInstance,
  teamMembers,
  checkOverdueSteps,
  handleStepComplete,
  handleAssignStepMember,
}) => {
  const [showAllSteps, setShowAllSteps] = useState(false);

  if (!isOpen || !activeInstance) return null;

  const totalSteps = activeInstance.steps.length;
  const completedSteps = activeInstance.steps.filter(s => s.isCompleted).length;
  
  const stepsActive = [];
  activeInstance.steps.forEach((step, idx) => {
    if (idx === 0) {
      stepsActive.push(true);
    } else {
      const prevStep = activeInstance.steps[idx - 1];
      const isPrevCompleted = prevStep.isCompleted;
      const isSameDeadline = prevStep.relativeOffsetDays === step.relativeOffsetDays ||
        new Date(prevStep.dueDate).toDateString() === new Date(step.dueDate).toDateString();
      const active = isPrevCompleted || (stepsActive[idx - 1] && isSameDeadline);
      stepsActive.push(active);
    }
  });

  let activeIndex = activeInstance.steps.findIndex((s, idx) => !s.isCompleted && stepsActive[idx]);
  if (activeIndex === -1) {
    const allDone = activeInstance.steps.every(s => s.isCompleted);
    activeIndex = allDone ? totalSteps : 0;
  }

  const highlighted = [];
  
  if (activeIndex > 0 && activeInstance.steps[activeIndex - 1]) {
    highlighted.push({ step: activeInstance.steps[activeIndex - 1], index: activeIndex - 1, status: 'completed' });
  }
  if (activeIndex < totalSteps && activeInstance.steps[activeIndex]) {
    highlighted.push({ step: activeInstance.steps[activeIndex], index: activeIndex, status: 'active' });
  }
  if (activeIndex + 1 < totalSteps && activeInstance.steps[activeIndex + 1]) {
    highlighted.push({ step: activeInstance.steps[activeIndex + 1], index: activeIndex + 1, status: 'upcoming' });
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '850px', width: '95%', maxHeight: '85vh', overflowY: 'auto', padding: 0, borderRadius: 'var(--radius-lg)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'sticky', top: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', zIndex: 10, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
           <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Detalles de la Ejecución</span>
           <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
        </div>
        <div style={{ padding: '0 2rem 2rem 2rem' }}>
          <div className="achievement-card-unified">
            {/* Header info */}
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                  {activeInstance.instanceName}
                </h2>
                <div style={{ fontSize: '1.1rem', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '8px' }}>
                  {activeInstance.category}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 400 }}>
                  Plantilla base: {activeInstance.title} • Iniciado el {new Date(activeInstance.startedAt).toLocaleDateString()}
                </p>
                
                {/* Involved people list at the top of modal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Involucrados:</span>
                  <div style={{ display: 'flex' }}>
                    {Array.from(new Set(activeInstance.steps.filter(s => s.assignedTo).map(s => s.assignedTo))).map((assigneeId, i) => {
                      const member = teamMembers.find(m => String(m.id) === String(assigneeId));
                      if (!member) return null;
                      const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      return (
                        <div key={assigneeId} title={member.name} style={{
                          width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold',
                          border: '2px solid white', marginLeft: i > 0 ? '-8px' : '0', zIndex: 10 - i
                        }}>
                          {initials}
                        </div>
                      );
                    })}
                    {Array.from(new Set(activeInstance.steps.filter(s => s.assignedTo).map(s => s.assignedTo))).length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ninguno asignado aún</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {checkOverdueSteps(activeInstance) && (
                  <span className="overdue-badge">⚠️ Con Atraso</span>
                )}
              </div>
            </div>

            {/* Achievement style - Big unlocked counter */}
            <div className="achievement-unlocked-section" style={{ textAlign: 'center', margin: '2rem 0' }}>
              <p className="achievement-unlocked-count" style={{ fontSize: '4.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, lineHeight: 1 }}>
                {completedSteps} <span className="fraction-total" style={{ fontSize: '2rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalSteps}</span>
              </p>
              <p className="achievement-unlocked-label" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pasos Completados en este Flujo
              </p>
            </div>

            {/* Highlighted Steps (Trio Display) */}
            <div className="achievement-trio-display">
              {highlighted.map((item, index) => {
                const step = item.step;
                const isOverdue = !step.isCompleted && new Date() > new Date(step.dueDate);
                const alignmentClass = highlighted.length === 3 
                  ? (index === 1 ? "trio-active" : "trio-side") 
                  : (item.status === 'active' ? "trio-active" : "trio-side");

                return (
                  <div key={step.id} className={`trio-card ${alignmentClass} ${item.status}`}>
                    <div className="trio-card-header">
                      <span className="trio-badge-number">Paso {item.index + 1}</span>
                      {item.status === 'completed' && <Check size={16} className="text-success-icon" />}
                      {item.status === 'active' && <Clock size={16} className="text-active-icon animate-pulse" />}
                      {item.status === 'upcoming' && <AlertCircle size={16} className="text-muted-icon" />}
                    </div>

                    <h4 className="trio-card-title">{step.title}</h4>
                    
                    {item.status === 'active' && (
                      <>
                        <span className="trio-card-date">Límite: {new Date(step.dueDate).toLocaleDateString()}</span>
                        <p className="trio-card-desc">{step.description}</p>
                        
                        {isOverdue && (
                          <div className="overdue-banner">
                            <AlertCircle size={14} />
                            <span>Límite vencido el {new Date(step.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}

                        <div className="trio-card-action">
                          {step.type === 'manual' ? (
                            <label className="emotional-checkbox-label">
                              <input 
                                type="checkbox"
                                checked={step.isCompleted}
                                disabled={step.isCompleted}
                                onChange={(e) => handleStepComplete(activeInstance.id, step.id, e.target.checked)}
                              />
                              <div className="checkbox-visual">
                                {step.isCompleted && <Check size={16} />}
                              </div>
                              <span>Marcar como hecho</span>
                            </label>
                          ) : (
                            <div style={{ width: '100%' }}>
                              {step.isCompleted ? (
                                <div className="uploaded-badge">
                                  <FileCheck size={14} />
                                  <span>{step.uploadedFileName || 'Cargado'}</span>
                                </div>
                              ) : (
                                <label className="step-file-upload" style={{ display: 'block', margin: 0, padding: '0.4rem' }}>
                                  <input 
                                    type="file" 
                                    style={{ display: 'none' }}
                                    accept={step.acceptedFormats?.join(',')}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleStepComplete(activeInstance.id, step.id, true, file.name);
                                      }
                                    }}
                                  />
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <Upload size={14} className="text-primary" />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                      Subir archivo ({step.acceptedFormats?.join(', ')})
                                    </span>
                                  </div>
                                </label>
                              )}
                            </div>
                          )}
                        </div>

                        {step.motivation && (
                          <div className="step-motivation" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                            💡 {step.motivation}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', background: '#f5f3f0', padding: '0.15rem 0.5rem', borderRadius: '20px', marginTop: '0.5rem', width: 'fit-content' }}>
                          <select
                            value={step.assignedTo ? String(step.assignedTo) : ''}
                            onChange={(e) => handleAssignStepMember(activeInstance.id, step.id, e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 0' }}
                          >
                            <option value="">Sin Asignar</option>
                            {teamMembers.map(m => (
                              <option key={m.id} value={String(m.id)}>{m.name}</option>
                            ))}
                          </select>
                          {step.assignedTo && teamMembers.find(m => String(m.id) === String(step.assignedTo)) && (
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold' }}>{teamMembers.find(m => String(m.id) === String(step.assignedTo)).name.charAt(0).toUpperCase()}</div>
                          )}
                        </div>
                      </>
                    )}

                    {item.status !== 'active' && (
                      <p className="trio-card-desc-compact">{step.description}</p>
                    )}
                    
                    {item.status === 'upcoming' && (
                      <span className="trio-card-date">Límite estimado: {new Date(step.dueDate).toLocaleDateString()}</span>
                    )}
                    {item.status === 'completed' && (
                      <span className="badge success" style={{ fontSize: '0.7rem', display: 'inline-block', width: 'fit-content', marginTop: '0.5rem' }}>Completado</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* All Steps Collapsible Section */}
            <div className="achievement-steps-list-section">
              <div className="steps-list-header" onClick={() => setShowAllSteps(!showAllSteps)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
                <h3 className="text-primary text-sm font-medium" style={{ margin: 0 }}>
                  Todos los Pasos del Proceso ({totalSteps})
                </h3>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                  {showAllSteps ? 'Ocultar Detalles' : 'Ver Todos'}
                </button>
              </div>

              {showAllSteps && (
                <div className="steps-container" style={{ marginTop: '1.25rem' }}>
                  {activeInstance.steps.map((step, idx) => {
                    const isActive = !step.isCompleted && stepsActive[idx];
                    const isLocked = !step.isCompleted && !stepsActive[idx];
                    const isOverdue = !step.isCompleted && new Date() > new Date(step.dueDate);

                    return (
                      <div 
                        key={step.id} 
                        className={`step-row ${step.isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                        style={{ opacity: isLocked ? 0.65 : 1 }}
                      >
                        <div className="step-indicator">
                          {step.isCompleted ? <Check size={20} /> : idx + 1}
                        </div>

                        <div className="step-card">
                          <div className="step-card-header">
                            <div>
                              <h4>{step.title}</h4>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                                {step.durationLabel} (Límite: {new Date(step.dueDate).toLocaleDateString()})
                              </span>
                            </div>
                            <span className={`badge ${step.type === 'digital' ? 'success' : ''}`}>
                              {step.type === 'digital' ? 'Acción Digital' : 'Paso Manual'}
                            </span>
                          </div>
                          <p>{step.description}</p>

                          {isOverdue && (
                            <div className="overdue-banner">
                              <AlertCircle size={16} />
                              <span>Límite vencido el {new Date(step.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', background: '#f5f3f0', padding: '0.2rem 0.6rem', borderRadius: '20px', marginTop: '0.75rem', marginBottom: '0.75rem', width: 'fit-content' }}>
                            <select
                              value={step.assignedTo ? String(step.assignedTo) : ''}
                              onChange={(e) => handleAssignStepMember(activeInstance.id, step.id, e.target.value)}
                              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', cursor: 'pointer', padding: '2px 0' }}
                            >
                              <option value="">Sin Asignar</option>
                              {teamMembers.map(m => (
                                <option key={m.id} value={String(m.id)}>{m.name}</option>
                              ))}
                            </select>
                            {step.assignedTo && teamMembers.find(m => String(m.id) === String(step.assignedTo)) && (
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>{teamMembers.find(m => String(m.id) === String(step.assignedTo)).name.charAt(0).toUpperCase()}</div>
                            )}
                          </div>

                          {!isLocked && (
                            <div className="step-action-area">
                              {step.type === 'manual' ? (
                                <label className="emotional-checkbox-label">
                                  <input 
                                    type="checkbox"
                                    checked={step.isCompleted}
                                    disabled={step.isCompleted}
                                    onChange={(e) => handleStepComplete(activeInstance.id, step.id, e.target.checked)}
                                  />
                                  <div className="checkbox-visual">
                                    {step.isCompleted && <Check size={16} />}
                                  </div>
                                  <span>{step.isCompleted ? 'Logrado' : 'Marcar como hecho'}</span>
                                </label>
                              ) : (
                                <div>
                                  {step.isCompleted ? (
                                    <div className="uploaded-badge">
                                      <FileCheck size={16} />
                                      <span>{step.uploadedFileName || 'Archivo cargado'}</span>
                                    </div>
                                  ) : (
                                    <label className="step-file-upload">
                                      <input 
                                        type="file" 
                                        style={{ display: 'none' }}
                                        accept={step.acceptedFormats?.join(',')}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleStepComplete(activeInstance.id, step.id, true, file.name);
                                          }
                                        }}
                                      />
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Upload size={16} className="text-primary" />
                                        <span>Subir archivo ({step.acceptedFormats?.join(', ')})</span>
                                      </div>
                                    </label>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
