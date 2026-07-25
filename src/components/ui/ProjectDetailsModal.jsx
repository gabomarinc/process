import React, { useState, useRef } from 'react';
import { 
  X, 
  Check, 
  Calendar, 
  MessageSquare, 
  User, 
  Upload, 
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Trash2,
  ExternalLink
} from 'lucide-react';

export const ProjectDetailsModal = ({
  isOpen,
  onClose,
  activeInstance,
  kanbanColumns = ["Por hacer", "En curso", "Terminado"],
  teamMembers = [],
  onUpdateInstanceStatus,
  onUpdateInstancePriority,
  onUpdateInstanceAttachments,
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
  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  // Attachment free-upload state
  const [attachStepId, setAttachStepId] = useState('');
  const freeFileRef = useRef(null);

  React.useEffect(() => {
    setAiSummary('');
    setActiveModalTab('checklist');
  }, [activeInstance?.id]);

  if (!isOpen || !activeInstance) return null;

  const steps = activeInstance.steps || [];
  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.isCompleted).length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const instanceAttachments = activeInstance.attachments || [];

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

  // ── Free attachment upload ──
  const handleFreeAttachmentUpload = (file) => {
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);
    const newAttachment = {
      id: `att_${Date.now()}`,
      name: file.name,
      type: file.type,
      url: fileUrl,
      stepId: attachStepId || null,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.name || 'Usuario'
    };
    const updated = [...instanceAttachments, newAttachment];
    if (onUpdateInstanceAttachments) onUpdateInstanceAttachments(activeInstance.id, updated);
  };

  const handleDeleteAttachment = (attId) => {
    if (!window.confirm('¿Eliminar este adjunto?')) return;
    const updated = instanceAttachments.filter(a => a.id !== attId);
    if (onUpdateInstanceAttachments) onUpdateInstanceAttachments(activeInstance.id, updated);
  };

  // ── Calendar helpers ──
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const stepsWithDates = steps.filter(s => s.dueDate);
  // Map: "YYYY-MM-DD" -> array of steps
  const dateStepMap = {};
  stepsWithDates.forEach(step => {
    const key = step.dueDate.split('T')[0];
    if (!dateStepMap[key]) dateStepMap[key] = [];
    dateStepMap[key].push(step);
  });

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calMonth, calYear);
    const firstDay = getFirstDayOfMonth(calMonth, calYear); // 0=Sun
    // Shift to Mon-start
    const startOffset = (firstDay + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    return (
      <div>
        {/* Month nav */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
          <button
            onClick={() => {
              if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
              else setCalMonth(m => m - 1);
            }}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', borderRadius:'6px', color:'var(--text-muted)' }}
          ><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, fontSize:'0.9rem', color:'var(--text-main)' }}>
            {monthNames[calMonth]} {calYear}
          </span>
          <button
            onClick={() => {
              if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
              else setCalMonth(m => m + 1);
            }}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', borderRadius:'6px', color:'var(--text-muted)' }}
          ><ChevronRight size={16} /></button>
        </div>

        {/* Weekday headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', marginBottom:'4px' }}>
          {['Lu','Ma','Mi','Ju','Vi','Sa','Do'].map(d => (
            <div key={d} style={{ textAlign:'center', fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)', padding:'4px 0', textTransform:'uppercase' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px' }}>
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            const dateKey = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const daySteps = dateStepMap[dateKey] || [];
            const isToday = dateKey === todayKey;
            const hasOverdue = daySteps.some(s => !s.isCompleted && new Date(s.dueDate) < today);
            const hasCompleted = daySteps.some(s => s.isCompleted);
            const hasPending = daySteps.some(s => !s.isCompleted);

            let dotColor = null;
            if (daySteps.length > 0) {
              dotColor = hasOverdue ? '#ef4444' : hasPending ? 'var(--color-primary)' : '#10b981';
            }

            return (
              <div
                key={dateKey}
                title={daySteps.map(s => s.title).join('\n')}
                style={{
                  minHeight: '36px',
                  borderRadius: '6px',
                  background: isToday ? 'var(--color-primary)' : daySteps.length > 0 ? 'rgba(181,139,83,0.08)' : 'transparent',
                  border: isToday ? 'none' : daySteps.length > 0 ? '1px solid rgba(181,139,83,0.15)' : '1px solid transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  padding: '2px',
                  cursor: daySteps.length > 0 ? 'pointer' : 'default',
                  transition: 'all 0.15s'
                }}
              >
                <span style={{ fontSize:'0.75rem', fontWeight: isToday ? 700 : daySteps.length > 0 ? 600 : 400, color: isToday ? 'white' : 'var(--text-main)' }}>
                  {day}
                </span>
                {dotColor && (
                  <div style={{ width:'5px', height:'5px', borderRadius:'50%', background: isToday ? 'white' : dotColor }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Steps with due date in this month */}
        {stepsWithDates.filter(s => {
          const d = new Date(s.dueDate);
          return d.getMonth() === calMonth && d.getFullYear() === calYear;
        }).length > 0 && (
          <div style={{ marginTop:'1rem', borderTop:'1px solid rgba(0,0,0,0.06)', paddingTop:'0.75rem' }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'0.5rem' }}>
              Tareas este mes
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {stepsWithDates
                .filter(s => {
                  const d = new Date(s.dueDate);
                  return d.getMonth() === calMonth && d.getFullYear() === calYear;
                })
                .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate))
                .map(step => {
                  const isOverdue = new Date(step.dueDate) < today && !step.isCompleted;
                  return (
                    <div key={step.id} style={{
                      display:'flex', alignItems:'center', gap:'8px',
                      padding:'6px 8px', borderRadius:'6px',
                      background: isOverdue ? 'rgba(239,68,68,0.06)' : step.isCompleted ? 'rgba(16,185,129,0.06)' : 'rgba(181,139,83,0.06)',
                      borderLeft: `3px solid ${isOverdue ? '#ef4444' : step.isCompleted ? '#10b981' : 'var(--color-primary)'}`,
                      fontSize:'0.78rem'
                    }}>
                      <div style={{
                        width:'14px', height:'14px', borderRadius:'3px', flexShrink:0,
                        background: step.isCompleted ? '#10b981' : 'transparent',
                        border: `2px solid ${step.isCompleted ? '#10b981' : isOverdue ? '#ef4444' : 'var(--border-color)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center'
                      }}>
                        {step.isCompleted && <Check size={8} strokeWidth={3} color="white" />}
                      </div>
                      <div style={{ flex:1 }}>
                        <span style={{ fontWeight:600, color:'var(--text-main)', textDecoration: step.isCompleted ? 'line-through' : 'none' }}>
                          {step.title}
                        </span>
                      </div>
                      <span style={{ fontSize:'0.68rem', color: isOverdue ? '#ef4444' : 'var(--text-muted)', fontWeight:600 }}>
                        {new Date(step.dueDate).toLocaleDateString('es-ES', { day:'numeric', month:'short' })}
                        {isOverdue && ' ⚠️'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Attachment icon helper ──
  const getFileIcon = (type = '', name = '') => {
    if (type.includes('image')) return '🖼️';
    if (type.includes('pdf') || name.endsWith('.pdf')) return '📄';
    if (type.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.csv')) return '📊';
    if (type.includes('presentation') || name.endsWith('.pptx')) return '📋';
    if (type.includes('zip') || type.includes('rar')) return '🗜️';
    return '📎';
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div
        className="custom-wizard-card"
        style={{
          maxWidth: '960px',
          width: '94%',
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(255,255,255,0.9)',
          flexShrink: 0
        }}>
          <div>
            <span style={{ fontSize:'0.68rem', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.06em', color:'var(--color-primary-hover)' }}>
              {activeInstance.category || 'General'}
            </span>
            <h2 style={{ fontFamily:'var(--font-serif)', fontSize:'1.4rem', fontWeight:700, color:'var(--text-main)', margin:'2px 0 0 0' }}>
              {activeInstance.instanceName}
            </h2>
            <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
              Plantilla: {activeInstance.title}
            </span>
          </div>
          <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* ── Modal Body (split) ── */}
        <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

          {/* ── Left Column ── */}
          <div style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden'
          }}>
            {/* AI block – fixed inside left col */}
            <div style={{ padding:'1.25rem 1.5rem 0', flexShrink:0 }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(251,243,230,0.5) 0%, rgba(245,235,220,0.5) 100%)',
                border: '1px solid rgba(181,139,83,0.15)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.4rem' }}>
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--color-primary-hover)', display:'flex', alignItems:'center', gap:'6px' }}>
                    ✨ Asistente de Proyectos IA
                  </span>
                  {!isLoadingAI && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding:'3px 10px', fontSize:'0.72rem', minWidth:'auto', borderRadius:'15px' }}
                      onClick={handleConsultAI}
                    >
                      {aiSummary ? 'Actualizar 🔄' : 'Analizar 🧠'}
                    </button>
                  )}
                </div>
                {isLoadingAI ? (
                  <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>🧠 Analizando con Gemini...</div>
                ) : aiSummary ? (
                  <div style={{ whiteSpace:'pre-wrap', fontSize:'0.78rem', color:'var(--text-main)', lineHeight:'1.5' }}>{aiSummary}</div>
                ) : (
                  <p style={{ margin:0, fontSize:'0.75rem', color:'var(--text-muted)' }}>
                    ¿Quieres un resumen rápido? El asistente analiza el checklist y te dice qué hacer ahora.
                  </p>
                )}
              </div>

              {/* Tabs */}
              <div style={{ display:'flex', borderBottom:'1px solid rgba(0,0,0,0.06)', gap:'1rem', overflowX:'auto' }}>
                {[
                  { key:'checklist', label:'📋 Checklist' },
                  { key:'comments',  label:'💬 Comentarios' },
                  { key:'attachments', label:'📎 Adjuntos' },
                  { key:'calendar', label:'📅 Calendario' }
                ].map(({ key, label }) => {
                  const isActive = activeModalTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveModalTab(key)}
                      style={{
                        padding:'0.65rem 0.25rem',
                        background:'none', border:'none', cursor:'pointer',
                        borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                        fontSize:'0.83rem',
                        whiteSpace:'nowrap',
                        transition:'all 0.2s'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable tab content */}
            <div style={{ flex:1, overflowY:'auto', padding:'1.25rem 1.5rem', minHeight:0 }}>

              {/* ── CHECKLIST ── */}
              {activeModalTab === 'checklist' && (
                <>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
                    <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--text-main)', margin:0 }}>
                      Tareas ({completedSteps}/{totalSteps})
                    </h3>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                    {steps.map(step => {
                      const isExpanded = expandedStepId === step.id;
                      return (
                        <div
                          key={step.id}
                          style={{
                            border:'1px solid rgba(0,0,0,0.05)',
                            borderRadius:'8px',
                            background: step.isCompleted ? 'rgba(16,185,129,0.02)' : 'white',
                            overflow:'hidden',
                            transition:'all 0.2s'
                          }}
                        >
                          <div
                            style={{ padding:'0.85rem 1rem', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer' }}
                            onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                          >
                            <div
                              onClick={e => { e.stopPropagation(); handleStepCompleteClick(step.id, !step.isCompleted); }}
                              style={{
                                width:'20px', height:'20px', borderRadius:'4px', border:'2px solid',
                                borderColor: step.isCompleted ? '#10b981' : 'var(--border-color)',
                                background: step.isCompleted ? '#10b981' : 'transparent',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                color:'white', cursor:'pointer', flexShrink:0
                              }}
                            >
                              {step.isCompleted && <Check size={13} strokeWidth={3} />}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:'0.87rem', fontWeight:600, color: step.isCompleted ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: step.isCompleted ? 'line-through' : 'none' }}>
                                {step.title}
                              </div>
                              <div style={{ display:'flex', gap:'10px', marginTop:'3px', fontSize:'0.73rem', color:'var(--text-muted)', flexWrap:'wrap' }}>
                                {step.dueDate && (
                                  <span style={{ display:'flex', alignItems:'center', gap:'3px' }}>
                                    <Calendar size={11} /> {new Date(step.dueDate).toLocaleDateString('es-ES')}
                                  </span>
                                )}
                                {step.assignedTo && (
                                  <span style={{ display:'flex', alignItems:'center', gap:'3px' }}>
                                    <User size={11} /> {teamMembers.find(m => String(m.id) === String(step.assignedTo))?.name || 'Asignado'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ padding:'0 1rem 1rem', borderTop:'1px solid rgba(0,0,0,0.03)', background:'#faf9f6' }}>
                              <div style={{ fontSize:'0.79rem', color:'var(--text-muted)', marginTop:'0.65rem', lineHeight:'1.5' }}>
                                {step.description || 'Sin descripción adicional.'}
                              </div>
                              {step.motivation && (
                                <div style={{ display:'flex', gap:'8px', background:'#f5efe6', padding:'0.65rem', borderRadius:'6px', marginTop:'0.65rem', borderLeft:'3px solid var(--color-primary)' }}>
                                  <Lightbulb size={15} className="text-primary" style={{ flexShrink:0 }} />
                                  <div style={{ fontSize:'0.74rem', color:'#5c5243', fontStyle:'italic' }}>
                                    <strong>¿Por qué esto?:</strong> {step.motivation}
                                  </div>
                                </div>
                              )}
                              <div style={{ marginTop:'0.85rem', borderTop:'1px dashed rgba(0,0,0,0.06)', paddingTop:'0.65rem' }}>
                                <h4 style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'0.4rem', display:'flex', alignItems:'center', gap:'4px' }}>
                                  <MessageSquare size={11} /> Notas del paso
                                </h4>
                                <div style={{ display:'flex', flexDirection:'column', gap:'5px', marginBottom:'0.6rem' }}>
                                  {(step.comments || []).map(c => (
                                    <div key={c.id} style={{ background:'white', padding:'0.45rem 0.6rem', borderRadius:'5px', border:'1px solid rgba(0,0,0,0.04)' }}>
                                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem', fontWeight:600, color:'var(--text-muted)' }}>
                                        <span>{c.author}</span>
                                        <span>{new Date(c.timestamp).toLocaleString('es-ES', { dateStyle:'short', timeStyle:'short' })}</span>
                                      </div>
                                      <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'var(--text-main)' }}>{c.text}</p>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display:'flex', gap:'6px' }}>
                                  <input
                                    type="text" placeholder="Agregar nota..."
                                    value={activeStepCommentId === step.id ? commentText : ''}
                                    onChange={e => { setActiveStepCommentId(step.id); setCommentText(e.target.value); }}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddComment(step.id); }}
                                    style={{ flex:1, padding:'4px 8px', borderRadius:'4px', border:'1px solid var(--border-color)', fontSize:'0.74rem', outline:'none' }}
                                  />
                                  <button className="btn btn-secondary" style={{ padding:'2px 10px', fontSize:'0.72rem', minWidth:'auto' }} onClick={() => handleAddComment(step.id)}>
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

              {/* ── COMMENTS ── */}
              {activeModalTab === 'comments' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
                  <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--text-main)', margin:0 }}>Comentarios por Paso</h3>
                  {steps.map(step => {
                    const comments = step.comments || [];
                    return (
                      <div key={step.id} style={{ background:'#fcfbfa', borderRadius:'8px', border:'1px solid rgba(0,0,0,0.04)', padding:'1rem' }}>
                        <div style={{ fontWeight:600, fontSize:'0.83rem', color:'var(--color-primary-hover)', marginBottom:'0.65rem' }}>
                          {step.title}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'0.65rem' }}>
                          {comments.length === 0 ? (
                            <div style={{ fontSize:'0.77rem', color:'var(--text-muted)', fontStyle:'italic' }}>Sin comentarios aún.</div>
                          ) : (
                            comments.map(comm => (
                              <div key={comm.id} style={{ background:'white', borderRadius:'6px', padding:'0.45rem 0.7rem', border:'1px solid rgba(0,0,0,0.03)' }}>
                                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem', fontWeight:600, color:'var(--text-muted)', marginBottom:'2px' }}>
                                  <span>{comm.author}</span>
                                  <span>{new Date(comm.timestamp).toLocaleString('es-ES', { dateStyle:'short', timeStyle:'short' })}</span>
                                </div>
                                <p style={{ margin:0, fontSize:'0.79rem', color:'var(--text-main)' }}>{comm.text}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <div style={{ display:'flex', gap:'8px' }}>
                          <input
                            type="text" placeholder="Escribe un comentario..."
                            value={activeStepCommentId === step.id ? commentText : ''}
                            onChange={e => { setActiveStepCommentId(step.id); setCommentText(e.target.value); }}
                            onKeyDown={e => { if (e.key === 'Enter') { setActiveStepCommentId(step.id); handleAddComment(step.id); } }}
                            style={{ flex:1, padding:'6px 10px', borderRadius:'6px', border:'1px solid var(--border-color)', fontSize:'0.79rem', outline:'none' }}
                          />
                          <button className="btn btn-secondary" style={{ padding:'6px 12px', fontSize:'0.74rem', minWidth:'auto' }}
                            onClick={() => { setActiveStepCommentId(step.id); handleAddComment(step.id); }}>
                            Enviar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── ATTACHMENTS ── */}
              {activeModalTab === 'attachments' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
                  <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--text-main)', margin:0 }}>Archivos y Adjuntos</h3>

                  {/* Upload zone */}
                  <div style={{ background:'rgba(181,139,83,0.04)', border:'2px dashed rgba(181,139,83,0.25)', borderRadius:'10px', padding:'1.25rem' }}>
                    <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-main)', marginBottom:'0.65rem', display:'flex', alignItems:'center', gap:'6px' }}>
                      <Upload size={15} /> Subir nuevo adjunto
                    </div>

                    {/* Optional step association */}
                    <div style={{ marginBottom:'0.75rem' }}>
                      <label style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:'4px', textTransform:'uppercase' }}>
                        Asociar a un paso (opcional)
                      </label>
                      <select
                        value={attachStepId}
                        onChange={e => setAttachStepId(e.target.value)}
                        style={{ width:'100%', padding:'6px 8px', borderRadius:'6px', border:'1px solid var(--border-color)', fontSize:'0.8rem', outline:'none', background:'white' }}
                      >
                        <option value="">Sin asociación — adjunto general</option>
                        {steps.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>

                    <label style={{
                      display:'inline-flex', alignItems:'center', gap:'8px',
                      background:'white', border:'1px solid var(--border-color)', borderRadius:'8px',
                      padding:'8px 16px', fontSize:'0.82rem', cursor:'pointer', fontWeight:600,
                      transition:'all 0.2s'
                    }}>
                      <input
                        ref={freeFileRef}
                        type="file"
                        multiple
                        style={{ display:'none' }}
                        onChange={e => {
                          Array.from(e.target.files || []).forEach(file => handleFreeAttachmentUpload(file));
                          e.target.value = '';
                        }}
                      />
                      <Paperclip size={14} /> Seleccionar archivo(s)
                    </label>
                  </div>

                  {/* Attachment list */}
                  {instanceAttachments.length === 0 ? (
                    <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontStyle:'italic', textAlign:'center', padding:'1.5rem 0' }}>
                      No hay archivos adjuntos aún.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                      {instanceAttachments.map(att => {
                        const linkedStep = att.stepId ? steps.find(s => s.id === att.stepId) : null;
                        return (
                          <div key={att.id} style={{
                            display:'flex', alignItems:'center', gap:'12px',
                            background:'white', border:'1px solid rgba(0,0,0,0.05)',
                            borderRadius:'8px', padding:'0.7rem 1rem'
                          }}>
                            <span style={{ fontSize:'1.2rem', flexShrink:0 }}>{getFileIcon(att.type, att.name)}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:'0.83rem', fontWeight:600, color:'var(--text-main)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {att.name}
                              </div>
                              <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:'2px', display:'flex', gap:'10px' }}>
                                {linkedStep && <span>📌 {linkedStep.title}</span>}
                                <span>Subido por {att.uploadedBy}</span>
                                <span>{new Date(att.uploadedAt).toLocaleDateString('es-ES')}</span>
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                              <a href={att.url} target="_blank" rel="noopener noreferrer"
                                style={{ display:'flex', alignItems:'center', padding:'4px', borderRadius:'4px', background:'rgba(0,0,0,0.04)', color:'var(--text-muted)', textDecoration:'none' }}
                                title="Abrir">
                                <ExternalLink size={13} />
                              </a>
                              <button
                                onClick={() => handleDeleteAttachment(att.id)}
                                style={{ display:'flex', alignItems:'center', padding:'4px', borderRadius:'4px', background:'rgba(239,68,68,0.07)', border:'none', color:'#ef4444', cursor:'pointer' }}
                                title="Eliminar">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Step-level files (legacy from fileStore) */}
                  {steps.filter(s => s.uploadedFileName).length > 0 && (
                    <div>
                      <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'0.5rem' }}>
                        Archivos de pasos del proceso
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                        {steps.filter(s => s.uploadedFileName).map(step => (
                          <div key={step.id} style={{
                            display:'flex', alignItems:'center', gap:'12px', justifyContent:'space-between',
                            background:'#fcfbfa', border:'1px solid rgba(0,0,0,0.04)', borderRadius:'8px', padding:'0.65rem 1rem'
                          }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', minWidth:0 }}>
                              <span>📎</span>
                              <div>
                                <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-main)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {step.uploadedFileName}
                                </div>
                                <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>Paso: {step.title}</div>
                              </div>
                            </div>
                            <button
                              style={{ border:'none', background:'rgba(239,68,68,0.07)', color:'#ef4444', cursor:'pointer', padding:'4px 8px', borderRadius:'4px', fontSize:'0.7rem' }}
                              onClick={() => {
                                if (window.confirm('¿Eliminar este adjunto?')) {
                                  handleStepComplete(activeInstance.id, step.id, false, null);
                                  setFileStore(prev => { const n = { ...prev }; delete n[step.id]; return n; });
                                }
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── CALENDAR ── */}
              {activeModalTab === 'calendar' && (
                <div>
                  <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--text-main)', margin:'0 0 1rem 0' }}>
                    Calendario de Tareas
                  </h3>
                  {renderCalendar()}
                  {stepsWithDates.length === 0 && (
                    <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontStyle:'italic', textAlign:'center', padding:'2rem 0' }}>
                      📅 No hay fechas límite definidas para los pasos de este proceso.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* ── Right Sidebar (scrollable) ── */}
          <div style={{
            width: '240px',
            flexShrink: 0,
            padding: '1.25rem',
            background: 'rgba(245,243,240,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
            overflowY: 'auto'
          }}>
            {/* Status */}
            <div>
              <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'4px', textTransform:'uppercase' }}>
                Estado del Proyecto
              </label>
              <select
                value={activeInstance.status || 'Por hacer'}
                onChange={handleStatusChange}
                style={{ width:'100%', padding:'0.45rem 0.5rem', borderRadius:'6px', border:'1px solid var(--border-color)', fontSize:'0.83rem', fontWeight:600, outline:'none', background:'white', cursor:'pointer' }}
              >
                {kanbanColumns.map((col, idx) => (
                  <option key={idx} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'4px', textTransform:'uppercase' }}>
                Prioridad
              </label>
              <select
                value={activeInstance.priority || 'Media'}
                onChange={e => onUpdateInstancePriority(activeInstance.id, e.target.value)}
                style={{ width:'100%', padding:'0.45rem 0.5rem', borderRadius:'6px', border:'1px solid var(--border-color)', fontSize:'0.83rem', fontWeight:600, outline:'none', background:'white', cursor:'pointer' }}
              >
                <option value="Baja">Baja 🟢</option>
                <option value="Media">Media 🟡</option>
                <option value="Alta">Alta 🟠</option>
                <option value="Urgente">Urgente 🔴</option>
              </select>
            </div>

            {/* Progress */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'4px', textTransform:'uppercase' }}>
                <span>Progreso</span>
                <span>{progressPct}%</span>
              </div>
              <div style={{ height:'7px', background:'#f0ede9', borderRadius:'4px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progressPct}%`, background: progressPct === 100 ? '#10b981' : 'var(--color-primary)', borderRadius:'4px', transition:'width 0.3s ease' }} />
              </div>
              <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:'4px', textAlign:'right' }}>
                {completedSteps}/{totalSteps} tareas
              </div>
            </div>

            {/* Quick info */}
            <div style={{ background:'white', borderRadius:'8px', border:'1px solid rgba(0,0,0,0.04)', padding:'0.7rem', display:'flex', flexDirection:'column', gap:'6px', fontSize:'0.76rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--text-muted)' }}>Inicio:</span>
                <span style={{ fontWeight:600 }}>{new Date(activeInstance.startedAt).toLocaleDateString('es-ES')}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--text-muted)' }}>Guía IA:</span>
                <span style={{ fontWeight:600 }}>{activeInstance.companionAvatar} {activeInstance.companionName}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--text-muted)' }}>Adjuntos:</span>
                <span style={{ fontWeight:600 }}>{instanceAttachments.length}</span>
              </div>
            </div>

            {/* Assigned team */}
            <div>
              <span style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'6px', textTransform:'uppercase' }}>
                Equipo Asignado
              </span>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {(() => {
                  const memberEmails = new Set();
                  const memberIds = new Set();
                  steps.forEach(step => {
                    if (step.assignedTo && step.assignedTo !== 'Unassigned') {
                      if (step.assignedTo.includes('@')) memberEmails.add(step.assignedTo);
                      else memberIds.add(step.assignedTo);
                    }
                  });
                  const assigned = teamMembers.filter(m => memberIds.has(String(m.id)) || memberEmails.has(m.email));
                  if (assigned.length === 0) return (
                    <span style={{ fontSize:'0.76rem', color:'var(--text-muted)', fontStyle:'italic' }}>Ningún miembro asignado.</span>
                  );
                  return assigned.map((member, idx) => (
                    <div key={idx} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.79rem' }}>
                      <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'var(--color-primary)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.7rem', flexShrink:0 }}>
                        {member.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600 }}>{member.name}</div>
                        <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{member.role}</div>
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
