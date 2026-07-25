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
  currentUser,
  fileStore = {},
  setFileStore
}) => {
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [activeStepCommentId, setActiveStepCommentId] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('checklist');

  React.useEffect(() => {
    setAiSummary('');
    setActiveModalTab('checklist');
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
          
          {/* Left Column - Checklist and Tabs (70%) */}
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

            {/* Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: '1.5rem', gap: '1.5rem' }}>
              {['checklist', 'comments', 'attachments', 'calendar'].map((tab) => {
                const labelMap = {
                  checklist: '📋 Checklist',
                  comments: '💬 Comentarios',
                  attachments: '📎 Adjuntos',
                  calendar: '📅 Calendario'
                };
                const isActive = activeModalTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveModalTab(tab)}
                    style={{
                      padding: '0.75rem 0.25rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {labelMap[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab: Checklist */}
            {activeModalTab === 'checklist' && (
              <>
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
                          border: '1px solid rgba(0, 0, 0, 0.05)',
                          borderRadius: '8px',
                          background: step.isCompleted ? 'rgba(16, 185, 129, 0.02)' : 'white',
                          transition: 'all 0.2s',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Summary Row */}
                        <div 
                          style={{
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                        >
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStepCompleteClick(step.id, !step.isCompleted);
                            }}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: '2px solid',
                              borderColor: step.isCompleted ? '#10b981' : 'var(--border-color)',
                              background: step.isCompleted ? '#10b981' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            {step.isCompleted && <Check size={14} strokeWidth={3} />}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '0.88rem', 
                              fontWeight: 600, 
                              color: step.isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                              textDecoration: step.isCompleted ? 'line-through' : 'none'
                            }}>
                              {step.title}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {step.dueDate && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Calendar size={12} /> {new Date(step.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {step.assignedTo && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <User size={12} /> {teamMembers.find(m => String(m.id) === String(step.assignedTo))?.name || 'Asignado'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid rgba(0,0,0,0.03)', background: '#faf9f6' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: '1.4' }}>
                              {step.description || 'Sin descripción adicional.'}
                            </div>

                            {step.motivation && (
                              <div style={{ 
                                display: 'flex', 
                                gap: '8px', 
                                background: '#f5efe6', 
                                padding: '0.75rem', 
                                borderRadius: '6px', 
                                marginTop: '0.75rem',
                                borderLeft: '3px solid var(--color-primary)'
                              }}>
                                <Lightbulb size={16} className="text-primary" style={{ flexShrink: 0 }} />
                                <div style={{ fontSize: '0.75rem', color: '#5c5243', fontStyle: 'italic' }}>
                                  <strong>¿Por qué hacemos esto?:</strong> {step.motivation}
                                </div>
                              </div>
                            )}

                            {/* Comments section */}
                            <div style={{ marginTop: '1rem', borderTop: '1px dashed rgba(0,0,0,0.06)', paddingTop: '0.75rem' }}>
                              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MessageSquare size={12} /> Notas del paso
                              </h4>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0.75rem' }}>
                                {(step.comments || []).map((c) => (
                                  <div key={c.id} style={{ background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                      <span>{c.author}</span>
                                      <span>{new Date(c.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-main)' }}>{c.text}</p>
                                  </div>
                                ))}
                              </div>

                              <div style={{ display: 'flex', gap: '6px' }}>
                                <input 
                                  type="text"
                                  placeholder="Agregar nota..."
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
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Tab: Comments */}
            {activeModalTab === 'comments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Comentarios por Paso</h3>
                {steps.map(step => {
                  const comments = step.comments || [];
                  return (
                    <div key={step.id} style={{ background: '#fcfbfa', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)', padding: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-primary-hover)', marginBottom: '0.75rem' }}>
                        Paso: {step.title}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        {comments.length === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin comentarios aún.</div>
                        ) : (
                          comments.map((comm) => (
                            <div key={comm.id} style={{ background: 'white', borderRadius: '6px', padding: '0.5rem 0.75rem', border: '1px solid rgba(0,0,0,0.02)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '2px' }}>
                                <span>{comm.author}</span>
                                <span>{new Date(comm.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)' }}>{comm.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text"
                          placeholder="Escribe un comentario..."
                          value={activeStepCommentId === step.id ? commentText : ''}
                          onChange={(e) => {
                            setActiveStepCommentId(step.id);
                            setCommentText(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(step.id);
                            }
                          }}
                          style={{
                            flex: 1, 
                            padding: '6px 10px', 
                            borderRadius: '6px', 
                            border: '1px solid var(--border-color)', 
                            fontSize: '0.8rem',
                            outline: 'none'
                          }}
                        />
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.75rem', minWidth: 'auto' }}
                          onClick={() => {
                            setActiveStepCommentId(step.id);
                            handleAddComment(step.id);
                          }}
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab: Attachments */}
            {activeModalTab === 'attachments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Archivos y Adjuntos</h3>
                {steps.map(step => {
                  const hasFile = !!step.uploadedFileName;

                  return (
                    <div key={step.id} style={{ background: '#fcfbfa', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{step.title}</span>
                        {step.acceptedFormats && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Formatos aceptados: {step.acceptedFormats.join(', ')}</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {hasFile ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem' }}>
                            <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={step.uploadedFileName}>
                              📎 {step.uploadedFileName}
                            </span>
                            <button
                              style={{ border: 'none', background: 'none', color: '#c62828', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold' }}
                              onClick={() => {
                                if (window.confirm("¿Seguro que deseas eliminar este adjunto?")) {
                                  handleStepComplete(activeInstance.id, step.id, false, null);
                                  setFileStore(prev => {
                                    const next = { ...prev };
                                    delete next[step.id];
                                    return next;
                                  });
                                }
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                            <input 
                              type="file" 
                              style={{ display: 'none' }}
                              accept={step.acceptedFormats?.join(',')}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const fileUrl = URL.createObjectURL(file);
                                  setFileStore(prev => ({
                                    ...prev,
                                    [step.id]: { url: fileUrl, name: file.name, type: file.type }
                                  }));
                                  handleStepComplete(activeInstance.id, step.id, true, file.name);
                                }
                              }}
                            />
                            <span>Subir Archivo</span>
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab: Calendar */}
            {activeModalTab === 'calendar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Planificación y Fechas Límite</h3>
                {steps.every(s => !s.dueDate) ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', background: '#fcfbfa', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)' }}>
                    No hay fechas límite definidas para los pasos de este proceso.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[...steps]
                      .sort((a, b) => {
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return new Date(a.dueDate) - new Date(b.dueDate);
                      })
                      .map(step => {
                        if (!step.dueDate) return null;
                        
                        const isOverdue = new Date(step.dueDate) < new Date() && !step.isCompleted;
                        const formattedDate = new Date(step.dueDate).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });

                        return (
                          <div 
                            key={step.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px', 
                              background: '#fcfbfa', 
                              borderRadius: '8px', 
                              border: '1px solid rgba(0,0,0,0.04)', 
                              padding: '0.75rem 1rem',
                              borderLeft: isOverdue ? '4px solid #c62828' : step.isCompleted ? '4px solid #10b981' : '4px solid var(--color-primary)'
                            }}
                          >
                            <Calendar size={16} style={{ color: isOverdue ? '#c62828' : step.isCompleted ? '#10b981' : 'var(--text-muted)' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{step.title}</span>
                                {isOverdue && <span style={{ fontSize: '0.65rem', background: '#ffebee', color: '#c62828', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>RETRASADO</span>}
                                {step.isCompleted && <span style={{ fontSize: '0.65rem', background: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>COMPLETADO</span>}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {formattedDate}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

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
