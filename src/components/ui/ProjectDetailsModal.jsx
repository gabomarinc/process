import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Calendar, 
  MessageSquare, 
  User, 
  Upload, 
  AlertCircle, 
  Lightbulb 
} from 'lucide-react';

export const ProjectDetailsModal = ({
  isOpen,
  onClose,
  activeInstance,
  kanbanColumns = ["Por hacer", "En curso", "Terminado"],
  teamMembers = [],
  onUpdateInstanceStatus,
  onUpdateInstancePriority,
  onAskAIForProjectSummary,
  handleStepComplete,
  handleAssignStepMember,
  handleUpdateStepComments,
  currentUser
}) => {
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [activeStepCommentId, setActiveStepCommentId] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  React.useEffect(() => {
    setAiSummary('');
  }, [activeInstance?.id]);

  if (!isOpen || !activeInstance) return null;

  const steps = activeInstance.steps || [];
  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.isCompleted).length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Handle status select change
  const handleStatusChange = (e) => {
    onUpdateInstanceStatus(activeInstance.id, e.target.value);
  };

  const handleStepCompleteClick = (stepId, isChecked) => {
    handleStepComplete(activeInstance.id, stepId, isChecked, null);
  };

  const handleAddComment = async (stepId) => {
    if (!commentText.trim()) return;

    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    const newComment = {
      id: `comment_${Date.now()}`,
      author: currentUser?.name || 'Usuario',
      text: commentText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...(step.comments || []), newComment];
    await handleUpdateStepComments(activeInstance.id, stepId, updatedComments);
    setCommentText('');
  };

  const handleConsultAI = async () => {
    setIsLoadingAI(true);
    setAiSummary('');
    try {
      const result = await onAskAIForProjectSummary(activeInstance);
      setAiSummary(result);
    } catch (e) {
      setAiSummary("Error al generar resumen.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div 
        className="custom-wizard-card" 
        style={{ 
          maxWidth: '850px', 
          width: '90%', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0,
          overflow: 'hidden'
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '1.5rem', 
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(255, 255, 255, 0.8)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-primary-hover)' }}>
              {activeInstance.category || 'General'}
            </span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
              {activeInstance.instanceName}
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Plantilla: {activeInstance.title}
            </span>
          </div>
          <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Split */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexWrap: 'wrap' }}>
          
          {/* Left Column - Checklist (70%) */}
          <div style={{ 
            flex: '1 1 500px', 
            padding: '1.5rem', 
            overflowY: 'auto',
            borderRight: '1px solid rgba(0,0,0,0.06)'
          }}>
            {/* Notion AI Assistant Block */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(251, 243, 230, 0.4) 0%, rgba(245, 235, 220, 0.4) 100%)',
              border: '1px solid rgba(181, 139, 83, 0.15)',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.5rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-hover)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✨ Asistente de Proyectos IA
                </span>
                {!isLoadingAI && (
                  <button 
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '0.75rem', minWidth: 'auto', borderRadius: '15px' }}
                    onClick={handleConsultAI}
                  >
                    {aiSummary ? 'Actualizar 🔄' : 'Analizar Estado 🧠'}
                  </button>
                )}
              </div>

              {isLoadingAI ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  🧠 Analizando tareas y cronogramas con Gemini...
                </div>
              ) : aiSummary ? (
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  {aiSummary}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  ¿Quieres un resumen rápido de las siguientes acciones y alertas críticas del proyecto? Deja que el asistente analice el checklist por ti.
                </p>
              )}
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
              Tareas del Proyecto ({completedSteps}/{totalSteps})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {steps.map((step, idx) => {
                const isExpanded = expandedStepId === step.id;
                
                return (
                  <div 
                    key={step.id} 
                    style={{
                      border: '1px solid rgba(0,0,0,0.05)',
                      borderRadius: '8px',
                      background: step.isCompleted ? 'rgba(240, 248, 240, 0.4)' : 'white',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header of Task Row */}
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '0.85rem 1rem', 
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                    >
                      <input 
                        type="checkbox"
                        checked={step.isCompleted}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStepCompleteClick(step.id, e.target.checked);
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          marginRight: '12px',
                          cursor: 'pointer',
                          accentColor: 'var(--color-primary)'
                        }}
                      />
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: 600, 
                          fontSize: '0.88rem', 
                          color: step.isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                          textDecoration: step.isCompleted ? 'line-through' : 'none'
                        }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>Paso {idx + 1}</span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Calendar size={10} /> 
                            {new Date(step.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      {/* Right indicator: notes count / expand state */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        {step.comments?.length > 0 && (
                          <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <MessageSquare size={12} /> {step.comments.length}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem' }}>{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{ 
                        padding: '0 1rem 1rem 2.75rem', 
                        borderTop: '1px solid rgba(0,0,0,0.02)',
                        fontSize: '0.82rem',
                        color: 'var(--text-main)'
                      }}>
                        <p style={{ margin: '0.5rem 0', lineHeight: '1.4', color: 'var(--text-muted)' }}>
                          {step.description || 'Sin descripción disponible.'}
                        </p>

                        {step.motivation && (
                          <div style={{ 
                            background: 'rgba(253, 246, 233, 0.5)', 
                            color: '#b58b53', 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            marginTop: '0.5rem',
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'flex-start'
                          }}>
                            <Lightbulb size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem' }}>{step.motivation}</span>
                          </div>
                        )}

                        {/* Assignee section */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Asignado a:</span>
                          <select 
                            value={step.assignedTo || 'Unassigned'} 
                            onChange={(e) => handleAssignStepMember(activeInstance.id, step.id, e.target.value)}
                            style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              border: '1px solid var(--border-color)', 
                              fontSize: '0.75rem',
                              outline: 'none',
                              background: 'white'
                            }}
                          >
                            <option value="Unassigned">Sin Asignar</option>
                            {teamMembers.map(member => (
                              <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                            ))}
                          </select>
                        </div>

                        {/* Step comments / Notes thread */}
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '0.75rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-main)' }}>Comentarios del Paso</span>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.5rem' }}>
                            {(step.comments || []).map(comment => (
                              <div key={comment.id} style={{ background: '#f9f8f6', padding: '6px 10px', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                  <span>{comment.author}</span>
                                  <span>{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-main)' }}>{comment.text}</p>
                              </div>
                            ))}

                            {/* Add comment inline box */}
                            <div style={{ display: 'flex', gap: '6px', marginTop: '0.5rem' }}>
                              <input 
                                type="text"
                                placeholder="Escribe una nota..."
                                value={activeStepCommentId === step.id ? commentText : ''}
                                onChange={(e) => {
                                  setActiveStepCommentId(step.id);
                                  setCommentText(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddComment(step.id);
                                }}
                                style={{ 
                                  flex: 1, 
                                  padding: '4px 8px', 
                                  borderRadius: '4px', 
                                  border: '1px solid var(--border-color)', 
                                  fontSize: '0.75rem',
                                  outline: 'none'
                                }}
                              />
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '2px 10px', fontSize: '0.72rem', minWidth: 'auto' }}
                                onClick={() => handleAddComment(step.id)}
                              >
                                Enviar
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Sidebar Metadata (30%) */}
          <div style={{ 
            flex: '1 1 250px', 
            padding: '1.5rem', 
            background: 'rgba(245, 243, 240, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {/* Status Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Estado del Proyecto
              </label>
              <select 
                value={activeInstance.status || 'Por hacer'} 
                onChange={handleStatusChange}
                style={{ 
                  width: '100%',
                  padding: '0.5rem', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border-color)', 
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                {kanbanColumns.map((col, idx) => (
                  <option key={idx} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Priority Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Prioridad
              </label>
              <select 
                value={activeInstance.priority || 'Media'} 
                onChange={(e) => onUpdateInstancePriority(activeInstance.id, e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '0.5rem', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border-color)', 
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="Baja">Baja 🟢</option>
                <option value="Media">Media 🟡</option>
                <option value="Alta">Alta 🟠</option>
                <option value="Urgente">Urgente 🔴</option>
              </select>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                <span>Progreso General</span>
                <span>{progressPct}%</span>
              </div>
              <div style={{ height: '8px', background: '#f0ede9', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${progressPct}%`, 
                    background: progressPct === 100 ? '#10b981' : 'var(--color-primary)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Quick stats details */}
            <div style={{ 
              background: 'white', 
              borderRadius: '8px', 
              border: '1px solid rgba(0,0,0,0.04)',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.78rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Inicio:</span>
                <span style={{ fontWeight: 600 }}>{new Date(activeInstance.startedAt).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Guía AI:</span>
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {activeInstance.companionAvatar} {activeInstance.companionName}
                </span>
              </div>
            </div>

            {/* Assigned people overview */}
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Equipo Asignado
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(() => {
                  const memberEmails = new Set();
                  const memberIds = new Set();
                  
                  steps.forEach(step => {
                    if (step.assignedTo && step.assignedTo !== 'Unassigned') {
                      if (step.assignedTo.includes('@')) {
                        memberEmails.add(step.assignedTo);
                      } else {
                        memberIds.add(step.assignedTo);
                      }
                    }
                  });

                  const assigned = teamMembers.filter(m => 
                    memberIds.has(String(m.id)) || 
                    memberEmails.has(m.email)
                  );

                  if (assigned.length === 0) {
                    return (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Ningún miembro asignado.
                      </span>
                    );
                  }

                  return assigned.map((member, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: 'var(--color-primary)', 
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}>
                        {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{member.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{member.role}</div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
};
