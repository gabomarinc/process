import React, { useState, useEffect } from 'react';
import { X, Check, Clock, AlertCircle, Upload, FileCheck, ChevronLeft, ChevronRight, Eye, Mail, Lightbulb, FileText, AlertTriangle, Settings, MessageSquare } from 'lucide-react';

export const ActiveExecutionModal = ({
  isOpen,
  onClose,
  activeInstance,
  teamMembers,
  checkOverdueSteps,
  handleStepComplete,
  handleAssignStepMember,
  handleUpdateStepComments,
  currentUser,
  fileStore = {},
  setFileStore
}) => {
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [commentingStepId, setCommentingStepId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  // Email sub-modal states
  const [emailModalStep, setEmailModalStep] = useState(null);
  const [emailToMode, setEmailToMode] = useState('client'); // 'client', 'member', 'other'
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSendStatus, setEmailSendStatus] = useState(null);

  useEffect(() => {
    if (activeInstance && isOpen) {
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

      let activeIdx = activeInstance.steps.findIndex((s, idx) => !s.isCompleted && stepsActive[idx]);
      if (activeIdx === -1) {
        const allDone = activeInstance.steps.every(s => s.isCompleted);
        activeIdx = allDone ? activeInstance.steps.length - 1 : 0;
      }
      setFocusedIndex(activeIdx);
    }
  }, [activeInstance, isOpen]);

  // Load subject/body when a step is selected for emailing
  useEffect(() => {
    if (emailModalStep && activeInstance) {
      setEmailSubject(`[Proceso: ${activeInstance.instanceName}] Detalle del Paso: ${emailModalStep.title}`);
      
      let defaultBody = '';
      if (emailModalStep.isCompleted) {
        defaultBody = `Hola,\n\nTe informamos que el paso "${emailModalStep.title}" correspondiente al proceso "${activeInstance.instanceName}" ha sido COMPLETADO con éxito.\n\nSaludos cordiales.`;
      } else {
        defaultBody = `Hola,\n\nTe escribimos para informarte que el paso "${emailModalStep.title}" correspondiente al proceso "${activeInstance.instanceName}" se encuentra PENDIENTE de ejecución.\n\nFavor de estar atento para los siguientes avances.`;
      }
      setEmailBody(defaultBody);
      setEmailRecipient('');
      setEmailToMode('client');
    }
  }, [emailModalStep, activeInstance]);

  // Update recipient email based on target mode selection
  const handleRecipientModeChange = (mode) => {
    setEmailToMode(mode);
    if (mode === 'client') {
      setEmailRecipient('');
    } else if (mode === 'member') {
      if (teamMembers.length > 0) {
        setEmailRecipient(teamMembers[0].email);
      } else {
        setEmailRecipient('');
      }
    } else {
      setEmailRecipient('');
    }
  };

  const handleApplyTemplate = (type) => {
    if (!emailModalStep) return;
    let text = '';
    if (type === 'completado') {
      text = `Hola,\n\nTe informamos que el paso "${emailModalStep.title}" correspondiente al proceso "${activeInstance.instanceName}" ha sido COMPLETADO con éxito.\n\nSaludos cordiales.`;
    } else if (type === 'pendiente_cliente') {
      text = `Hola,\n\nPara poder avanzar con el paso "${emailModalStep.title}" de tu proceso "${activeInstance.instanceName}", requerimos tu apoyo con la información/documento correspondiente. Por favor haznos llegar lo solicitado a la brevedad.\n\nQuedamos atentos. ¡Muchas gracias!`;
    } else if (type === 'interno_equipo') {
      text = `Hola,\n\nTe escribo de forma interna para dar seguimiento al paso "${emailModalStep.title}" en el proceso "${activeInstance.instanceName}". Favor de revisarlo y coordinar los pendientes.\n\nSaludos.`;
    }
    setEmailBody(text);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailSendStatus({ loading: true });

    let smtpSettings = null;
    try {
      smtpSettings = JSON.parse(localStorage.getItem('smtp_settings'));
    } catch (err) {
      // Ignored
    }

    if (!smtpSettings || !smtpSettings.smtpHost || !smtpSettings.smtpUser || !smtpSettings.smtpPass) {
      setEmailSendStatus({
        success: false,
        msg: 'No tienes credenciales de correo SMTP guardadas. Por favor configúralas primero en tu sección Perfil/Configuración.'
      });
      return;
    }

    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/email/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          smtpSettings,
          to: emailRecipient,
          subject: emailSubject,
          text: emailBody,
          html: `<div style="font-family: sans-serif; line-height: 1.5; color: #2c2520;">
            <div style="background-color: #27bea7; color: white; padding: 1.5rem; border-radius: 12px 12px 0 0;">
              <h2 style="margin: 0; font-size: 1.5rem; font-family: Outfit, sans-serif;">Kônsul Process</h2>
            </div>
            <div style="padding: 2rem; border: 1px solid #eef0f2; border-radius: 0 0 12px 12px; border-top: none; background-color: #FAF8F5;">
              <p style="white-space: pre-wrap; font-size: 1rem; color: #2c2520; margin: 0 0 1.5rem 0;">${emailBody.replace(/\n/g, '<br />')}</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;" />
              <p style="font-size: 0.8rem; color: #7e7168; margin: 0;">Este es un correo enviado de forma segura desde el gestor de procesos Kônsul usando tu propio servidor SMTP.</p>
            </div>
          </div>`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo enviar el correo electrónico.');
      }

      setEmailSendStatus({ success: true, msg: '¡Correo electrónico enviado con éxito!' });
      setTimeout(() => {
        setEmailModalStep(null);
        setEmailSendStatus(null);
      }, 1500);
    } catch (err) {
      setEmailSendStatus({ success: false, msg: err.message });
    }
  };

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

  const highlighted = [];
  if (focusedIndex !== null && totalSteps > 0) {
    if (focusedIndex > 0 && activeInstance.steps[focusedIndex - 1]) {
      highlighted.push({
        step: activeInstance.steps[focusedIndex - 1],
        index: focusedIndex - 1,
        status: activeInstance.steps[focusedIndex - 1].isCompleted ? 'completed' : 'upcoming'
      });
    }
    
    if (activeInstance.steps[focusedIndex]) {
      highlighted.push({
        step: activeInstance.steps[focusedIndex],
        index: focusedIndex,
        status: activeInstance.steps[focusedIndex].isCompleted ? 'completed' : 'active'
      });
    }

    if (focusedIndex + 1 < totalSteps && activeInstance.steps[focusedIndex + 1]) {
      highlighted.push({
        step: activeInstance.steps[focusedIndex + 1],
        index: focusedIndex + 1,
        status: activeInstance.steps[focusedIndex + 1].isCompleted ? 'completed' : 'upcoming'
      });
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '850px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: 'var(--radius-lg)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Fixed Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
           <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>Detalles de la Ejecución</span>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <button
               onClick={() => setIsFocusMode(!isFocusMode)}
               style={{ border: 'none', background: isFocusMode ? '#e8f7f5' : '#f5f3f0', color: isFocusMode ? 'var(--color-primary-hover)' : 'var(--text-muted)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
             >
               {isFocusMode ? 'Modo Enfoque 🔍' : 'Modo Completo 📋'}
             </button>
             <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
           </div>
        </div>
        
        {/* Scrollable Content Container */}
        <div style={{ padding: '0.75rem 2rem 2rem 2rem', overflowY: 'auto', flex: 1 }}>
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
                  <span className="overdue-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> Con Atraso
                  </span>
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

            {/* Highlighted Steps (Trio Display) with Horizontal Navigation Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', justifyContent: 'center' }}>
              <button 
                type="button"
                onClick={() => setFocusedIndex(prev => Math.max(0, prev - 1))}
                disabled={focusedIndex === 0}
                className="close-btn-aesthetic"
                style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '40px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  opacity: focusedIndex === 0 ? 0.3 : 1,
                  cursor: focusedIndex === 0 ? 'not-allowed' : 'pointer'
                }}
                title="Paso Anterior"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="achievement-trio-display" style={{ flexGrow: 1, margin: '3.5rem 0 2rem 0' }}>
                {highlighted.map((item, index) => {
                  const step = item.step;
                  const isOverdue = !step.isCompleted && new Date() > new Date(step.dueDate);
                  const isCenter = focusedIndex === item.index;
                  const alignmentClass = isCenter ? "trio-active" : "trio-side";

                  return (
                    <div 
                      key={step.id} 
                      className={`trio-card ${alignmentClass} ${item.status}`}
                      style={{ 
                        cursor: 'pointer',
                        ...(isFocusMode && !isCenter ? { opacity: 0.2, filter: 'blur(2px)', pointerEvents: 'none' } : {})
                      }}
                      onClick={() => setFocusedIndex(item.index)}
                    >
                      <div className="trio-card-header">
                        <span className="trio-badge-number">Paso {item.index + 1}</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEmailModalStep(step); }}
                            className="close-btn-aesthetic"
                            style={{ width: '26px', height: '26px', padding: 0 }}
                            title="Enviar Correo del Paso"
                          >
                            <Mail size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setCommentingStepId(commentingStepId === step.id ? null : step.id); 
                              setCommentText('');
                            }}
                            className="close-btn-aesthetic"
                            style={{ width: '26px', height: '26px', padding: 0, color: step.comments?.length ? 'var(--color-primary-hover)' : 'inherit' }}
                            title="Comentarios / Notas"
                          >
                            <MessageSquare size={13} />
                          </button>
                          {item.status === 'completed' && <Check size={16} className="text-success-icon" />}
                          {item.status === 'active' && <Clock size={16} className="text-active-icon animate-pulse" />}
                          {item.status === 'upcoming' && <AlertCircle size={16} className="text-muted-icon" />}
                        </div>
                      </div>

                      <h4 className="trio-card-title">{step.title}</h4>
                      
                      {isCenter && (
                        <>
                          <span className="trio-card-date">Límite: {new Date(step.dueDate).toLocaleDateString()}</span>
                          <p className="trio-card-desc">{step.description}</p>
                          
                          {isOverdue && (
                            <div className="overdue-banner">
                              <AlertCircle size={14} />
                              <span>Límite vencido el {new Date(step.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}

                          {/* Float Comments Block */}
                          {commentingStepId === step.id && (
                            <div style={{ marginTop: '1rem', background: '#FAF8F5', border: '1px solid #ebd8c0', borderRadius: '8px', padding: '0.75rem', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Notas de Relevo</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({step.comments?.length || 0})</span>
                              </div>
                              <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                {(step.comments || []).map(c => (
                                  <div key={c.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                      <span>{c.userName}</span>
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '2px' }}>{c.text}</span>
                                  </div>
                                ))}
                                {(step.comments || []).length === 0 && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin notas en este paso. Escribe una abajo.</span>
                                )}
                              </div>
                              <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!commentText.trim()) return;
                                const newComment = {
                                  id: `c_${Date.now()}`,
                                  userName: currentUser?.name || 'Miembro',
                                  text: commentText,
                                  timestamp: new Date().toISOString()
                                };
                                const updatedComments = [...(step.comments || []), newComment];
                                await handleUpdateStepComments(activeInstance.id, step.id, updatedComments);
                                setCommentText('');
                              }} style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="text"
                                  placeholder="Nota..."
                                  value={commentText}
                                  onChange={e => setCommentText(e.target.value)}
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #ebd8c0', outline: 'none' }}
                                />
                                <button type="submit" className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                                  Guardar
                                </button>
                              </form>
                            </div>
                          )}

                          <div className="trio-card-action">
                            {step.type === 'manual' ? (
                              <div style={{ width: '100%' }} onClick={e => e.stopPropagation()}>
                                {step.isCompleted ? (
                                  <div style={{ color: 'var(--color-primary-hover)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                    <Check size={16} /> Paso Completado
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                                      onClick={() => handleStepComplete(activeInstance.id, step.id, true)}
                                    >
                                      {(() => {
                                        const nextStep = activeInstance.steps[item.index + 1];
                                        const nextAssignee = nextStep && nextStep.assignedTo ? teamMembers.find(m => String(m.id) === String(nextStep.assignedTo)) : null;
                                        return nextAssignee ? `Pasar a ${nextAssignee.name} ➡️` : 'Completar Paso ✔️';
                                      })()}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', fontSize: '0.75rem', padding: '0.35rem', marginTop: '0.5rem', background: 'transparent', border: '1px dashed #ebd8c0', color: '#b58b53' }}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const helpMsg = `${currentUser?.name || 'Un compañero'} solicita una mano en el paso "${step.title}" de "${activeInstance.instanceName}".`;
                                        try {
                                          await fetch('/api/notifications', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              id: `help-${step.id}-${Date.now()}`,
                                              instanceId: activeInstance.id,
                                              stepId: step.id,
                                              instanceName: activeInstance.instanceName,
                                              stepTitle: step.title,
                                              message: helpMsg,
                                              type: 'alert'
                                            })
                                          });
                                          alert("¡Pedido de ayuda enviado al equipo! Un compañero vendrá al rescate.");
                                        } catch (err) {
                                          console.error("Error al pedir ayuda:", err);
                                        }
                                      }}
                                    >
                                      🙋‍♂️ Pedir una mano
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div style={{ width: '100%' }} onClick={e => e.stopPropagation()}>
                                {step.isCompleted ? (
                                  <div className="uploaded-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <FileCheck size={14} />
                                      <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {step.uploadedFileName || 'Cargado'}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewFile(fileStore[step.id] || { name: step.uploadedFileName, mock: true })}
                                      className="close-btn-aesthetic"
                                      style={{ width: '24px', height: '24px', padding: 0 }}
                                      title="Previsualizar archivo"
                                    >
                                      <Eye size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <label className="step-file-upload" style={{ display: 'block', margin: 0, padding: '0.4rem' }}>
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
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <Upload size={14} className="text-primary" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                          Subir archivo ({step.acceptedFormats?.join(', ')})
                                        </span>
                                      </div>
                                    </label>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', fontSize: '0.75rem', padding: '0.35rem', marginTop: '0.5rem', background: 'transparent', border: '1px dashed #ebd8c0', color: '#b58b53' }}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const helpMsg = `${currentUser?.name || 'Un compañero'} solicita una mano en el paso "${step.title}" de "${activeInstance.instanceName}".`;
                                        try {
                                          await fetch('/api/notifications', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              id: `help-${step.id}-${Date.now()}`,
                                              instanceId: activeInstance.id,
                                              stepId: step.id,
                                              instanceName: activeInstance.instanceName,
                                              stepTitle: step.title,
                                              message: helpMsg,
                                              type: 'alert'
                                            })
                                          });
                                          alert("¡Pedido de ayuda enviado al equipo! Un compañero vendrá al rescate.");
                                        } catch (err) {
                                          console.error("Error al pedir ayuda:", err);
                                        }
                                      }}
                                    >
                                      🙋‍♂️ Pedir una mano
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {step.motivation && (
                            <div className="step-motivation" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                              <Lightbulb size={16} className="inline-block mr-1"/> {step.motivation}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', background: '#f5f3f0', padding: '0.15rem 0.5rem', borderRadius: '20px', marginTop: '0.5rem', width: 'fit-content' }} onClick={e => e.stopPropagation()}>
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

                      {!isCenter && (
                        <p className="trio-card-desc-compact">{step.description}</p>
                      )}
                      
                      {!isCenter && step.dueDate && (
                        <span className="trio-card-date">Límite: {new Date(step.dueDate).toLocaleDateString()}</span>
                      )}
                      {!isCenter && step.isCompleted && (
                        <span className="badge success" style={{ fontSize: '0.7rem', display: 'inline-block', width: 'fit-content', marginTop: '0.5rem' }}>Completado</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <button 
                type="button"
                onClick={() => setFocusedIndex(prev => Math.min(totalSteps - 1, prev + 1))}
                disabled={focusedIndex === totalSteps - 1}
                className="close-btn-aesthetic"
                style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '40px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  opacity: focusedIndex === totalSteps - 1 ? 0.3 : 1,
                  cursor: focusedIndex === totalSteps - 1 ? 'not-allowed' : 'pointer'
                }}
                title="Paso Siguiente"
              >
                <ChevronRight size={20} />
              </button>
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
                        style={{
                          opacity: isFocusMode ? (idx === activeInstance.steps.findIndex(s => !s.isCompleted) ? 1 : 0.2) : (isLocked ? 0.65 : 1),
                          filter: isFocusMode && (idx !== activeInstance.steps.findIndex(s => !s.isCompleted)) ? 'blur(1.5px)' : 'none',
                          pointerEvents: isFocusMode && (idx !== activeInstance.steps.findIndex(s => !s.isCompleted)) ? 'none' : 'auto'
                        }}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setEmailModalStep(step)}
                                className="close-btn-aesthetic"
                                style={{ width: '32px', height: '32px', padding: 0 }}
                                title="Enviar Correo del Paso"
                              >
                                <Mail size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCommentingStepId(commentingStepId === step.id ? null : step.id);
                                  setCommentText('');
                                }}
                                className="close-btn-aesthetic"
                                style={{ width: '32px', height: '32px', padding: 0, color: step.comments?.length ? 'var(--color-primary-hover)' : 'inherit' }}
                                title="Comentarios / Notas"
                              >
                                <MessageSquare size={15} />
                              </button>
                              <span className={`badge ${step.type === 'digital' ? 'success' : ''}`}>
                                {step.type === 'digital' ? 'Acción Digital' : 'Paso Manual'}
                              </span>
                            </div>
                          </div>
                          <p>{step.description}</p>

                          {/* Steps List Comments Block */}
                          {commentingStepId === step.id && (
                            <div style={{ marginTop: '1rem', background: '#FAF8F5', border: '1px solid #ebd8c0', borderRadius: '8px', padding: '0.75rem', textAlign: 'left' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Notas de Relevo</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({step.comments?.length || 0})</span>
                              </div>
                              <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                {(step.comments || []).map(c => (
                                  <div key={c.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                      <span>{c.userName}</span>
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '2px' }}>{c.text}</span>
                                  </div>
                                ))}
                                {(step.comments || []).length === 0 && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin notas en este paso. Escribe una abajo.</span>
                                )}
                              </div>
                              <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!commentText.trim()) return;
                                const newComment = {
                                  id: `c_${Date.now()}`,
                                  userName: currentUser?.name || 'Miembro',
                                  text: commentText,
                                  timestamp: new Date().toISOString()
                                };
                                const updatedComments = [...(step.comments || []), newComment];
                                await handleUpdateStepComments(activeInstance.id, step.id, updatedComments);
                                setCommentText('');
                              }} style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="text"
                                  placeholder="Nota..."
                                  value={commentText}
                                  onChange={e => setCommentText(e.target.value)}
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #ebd8c0', outline: 'none' }}
                                />
                                <button type="submit" className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                                  Guardar
                                </button>
                              </form>
                            </div>
                          )}

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
                             <div className="step-action-area" style={{ marginTop: '0.5rem' }}>
                               {step.type === 'manual' ? (
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                   {step.isCompleted ? (
                                     <div style={{ color: 'var(--color-primary-hover)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                       <Check size={16} /> Paso Completado
                                     </div>
                                   ) : (
                                     <>
                                       <button
                                         type="button"
                                         className="btn btn-primary"
                                         style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                                         onClick={() => handleStepComplete(activeInstance.id, step.id, true)}
                                       >
                                         {(() => {
                                           const nextStep = activeInstance.steps[idx + 1];
                                           const nextAssignee = nextStep && nextStep.assignedTo ? teamMembers.find(m => String(m.id) === String(nextStep.assignedTo)) : null;
                                           return nextAssignee ? `Pasar a ${nextAssignee.name} ➡️` : 'Completar Paso ✔️';
                                         })()}
                                       </button>
                                       <button
                                         type="button"
                                         className="btn btn-secondary"
                                         style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', fontSize: '0.75rem', padding: '0.35rem', background: 'transparent', border: '1px dashed #ebd8c0', color: '#b58b53' }}
                                         onClick={async (e) => {
                                           e.stopPropagation();
                                           const helpMsg = `${currentUser?.name || 'Un compañero'} solicita una mano en el paso "${step.title}" de "${activeInstance.instanceName}".`;
                                           try {
                                             await fetch('/api/notifications', {
                                               method: 'POST',
                                               headers: { 'Content-Type': 'application/json' },
                                               body: JSON.stringify({
                                                 id: `help-${step.id}-${Date.now()}`,
                                                 instanceId: activeInstance.id,
                                                 stepId: step.id,
                                                 instanceName: activeInstance.instanceName,
                                                 stepTitle: step.title,
                                                 message: helpMsg,
                                                 type: 'alert'
                                               })
                                             });
                                             alert("¡Pedido de ayuda enviado al equipo! Un compañero vendrá al rescate.");
                                           } catch (err) {
                                             console.error("Error al pedir ayuda:", err);
                                           }
                                         }}
                                       >
                                         🙋‍♂️ Pedir una mano
                                       </button>
                                     </>
                                   )}
                                 </div>
                               ) : (
                                 <div style={{ width: '100%' }}>
                                   {step.isCompleted ? (
                                     <div className="uploaded-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                         <FileCheck size={16} />
                                         <span>{step.uploadedFileName || 'Archivo cargado'}</span>
                                       </div>
                                       <button
                                         type="button"
                                         onClick={() => setPreviewFile(fileStore[step.id] || { name: step.uploadedFileName, mock: true })}
                                         className="close-btn-aesthetic"
                                         style={{ width: '28px', height: '28px', padding: 0 }}
                                         title="Previsualizar archivo"
                                       >
                                         <Eye size={14} />
                                       </button>
                                     </div>
                                   ) : (
                                     <>
                                       <label className="step-file-upload">
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
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                           <Upload size={16} className="text-primary" />
                                           <span>Subir archivo ({step.acceptedFormats?.join(', ')})</span>
                                         </div>
                                       </label>
                                       <button
                                         type="button"
                                         className="btn btn-secondary"
                                         style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', fontSize: '0.75rem', padding: '0.35rem', marginTop: '0.5rem', background: 'transparent', border: '1px dashed #ebd8c0', color: '#b58b53' }}
                                         onClick={async (e) => {
                                           e.stopPropagation();
                                           const helpMsg = `${currentUser?.name || 'Un compañero'} solicita una mano en el paso "${step.title}" de "${activeInstance.instanceName}".`;
                                           try {
                                             await fetch('/api/notifications', {
                                               method: 'POST',
                                               headers: { 'Content-Type': 'application/json' },
                                               body: JSON.stringify({
                                                 id: `help-${step.id}-${Date.now()}`,
                                                 instanceId: activeInstance.id,
                                                 stepId: step.id,
                                                 instanceName: activeInstance.instanceName,
                                                 stepTitle: step.title,
                                                 message: helpMsg,
                                                 type: 'alert'
                                               })
                                             });
                                             alert("¡Pedido de ayuda enviado al equipo! Un compañero vendrá al rescate.");
                                           } catch (err) {
                                             console.error("Error al pedir ayuda:", err);
                                           }
                                         }}
                                       >
                                         🙋‍♂️ Pedir una mano
                                       </button>
                                     </>
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

      {/* Preview File Sub-Modal Overlay */}
      {previewFile && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)' }} onClick={() => setPreviewFile(null)}>
          <div className="modal-card" style={{ maxWidth: '700px', width: '90%', padding: '1.5rem', background: '#fff', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700 }}>Previsualización del Documento</h3>
              <button className="close-btn-aesthetic" onClick={() => setPreviewFile(null)}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
              {previewFile.url ? (
                previewFile.type && previewFile.type.startsWith('image/') ? (
                  <img 
                    src={previewFile.url} 
                    alt={previewFile.name} 
                    style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #eee' }} 
                  />
                ) : previewFile.type === 'application/pdf' ? (
                  <iframe 
                    src={previewFile.url} 
                    title={previewFile.name} 
                    style={{ width: '100%', height: '400px', borderRadius: '8px', border: '1px solid #eee' }} 
                  />
                ) : (
                  // Other formats card
                  <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--color-primary)' }}><FileText size={48} /></div>
                    <h4 style={{ margin: '0 0 0.5rem 0', wordBreak: 'break-all' }}>{previewFile.name}</h4>
                    <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>
                      {previewFile.type || 'Archivo'}
                    </span>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '1rem' }}>
                      Previsualización interactiva no disponible para este formato. El archivo se subió correctamente.
                    </p>
                  </div>
                )
              ) : (
                // Mock preview for pre-existing uploaded files
                <div style={{ width: '100%' }}>
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--color-primary)' }}><FileText size={48} /></div>
                    <h4 style={{ margin: '0 0 0.5rem 0', wordBreak: 'break-all' }}>{previewFile.name}</h4>
                    <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>
                      Firma de Integridad Válida
                    </span>
                  </div>
                  
                  {/* Simulated document visual lines */}
                  <div style={{ padding: '1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ height: '14px', width: '30%', background: '#e2e8f0', borderRadius: '4px' }} />
                    <div style={{ height: '10px', width: '90%', background: '#f1f5f9', borderRadius: '4px' }} />
                    <div style={{ height: '10px', width: '85%', background: '#f1f5f9', borderRadius: '4px' }} />
                    <div style={{ height: '10px', width: '40%', background: '#f1f5f9', borderRadius: '4px' }} />
                    <div style={{ height: '10px', width: '95%', background: '#f1f5f9', borderRadius: '4px', marginTop: '8px' }} />
                    <div style={{ height: '10px', width: '70%', background: '#f1f5f9', borderRadius: '4px' }} />
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end', marginTop: '1rem' }}>
                {previewFile.url && (
                  <a 
                    href={previewFile.url} 
                    download={previewFile.name} 
                    style={{
                      textDecoration: 'none',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    Descargar
                  </a>
                )}
                <button 
                  onClick={() => setPreviewFile(null)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Step Email Sub-Modal Overlay */}
      {emailModalStep && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)' }} onClick={() => setEmailModalStep(null)}>
          <div className="modal-card" style={{ maxWidth: '600px', width: '90%', padding: '1.5rem', background: '#fff', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700 }}>Enviar Correo Informativo</h3>
              <button className="close-btn-aesthetic" onClick={() => setEmailModalStep(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Recipient Destination Selector */}
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Destinatario del Correo</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '4px' }}>
                  <div 
                    onClick={() => handleRecipientModeChange('client')}
                    style={{
                      padding: '8px',
                      border: '1px solid',
                      borderColor: emailToMode === 'client' ? 'var(--color-primary)' : '#d1d5db',
                      backgroundColor: emailToMode === 'client' ? 'rgba(39, 190, 167, 0.05)' : 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: emailToMode === 'client' ? 'var(--color-primary)' : 'var(--text-main)'
                    }}
                  >
                    Cliente
                  </div>
                  <div 
                    onClick={() => handleRecipientModeChange('member')}
                    style={{
                      padding: '8px',
                      border: '1px solid',
                      borderColor: emailToMode === 'member' ? 'var(--color-primary)' : '#d1d5db',
                      backgroundColor: emailToMode === 'member' ? 'rgba(39, 190, 167, 0.05)' : 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: emailToMode === 'member' ? 'var(--color-primary)' : 'var(--text-main)'
                    }}
                  >
                    Equipo
                  </div>
                  <div 
                    onClick={() => handleRecipientModeChange('other')}
                    style={{
                      padding: '8px',
                      border: '1px solid',
                      borderColor: emailToMode === 'other' ? 'var(--color-primary)' : '#d1d5db',
                      backgroundColor: emailToMode === 'other' ? 'rgba(39, 190, 167, 0.05)' : 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: emailToMode === 'other' ? 'var(--color-primary)' : 'var(--text-main)'
                    }}
                  >
                    Otro
                  </div>
                </div>

                {emailToMode === 'client' && (
                  <input
                    type="email"
                    required
                    placeholder="Escribe el email del cliente..."
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="custom-wizard-input"
                  />
                )}

                {emailToMode === 'member' && (
                  <select
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="custom-wizard-input"
                    required
                  >
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.email}>{m.name} ({m.email})</option>
                    ))}
                    {teamMembers.length === 0 && (
                      <option value="">No hay miembros de equipo registrados</option>
                    )}
                  </select>
                )}

                {emailToMode === 'other' && (
                  <input
                    type="email"
                    required
                    placeholder="correo@ejemplo.com"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="custom-wizard-input"
                  />
                )}
              </div>

              {/* Subject */}
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Asunto *</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="custom-wizard-input"
                />
              </div>

              {/* Body and Templates */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Mensaje *</label>
                  
                  {/* Template Quick Actions */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('completado')}
                      style={{ border: 'none', background: '#e8f5e9', color: '#2e7d32', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <Check size={14} className="inline-block mr-1"/> Hecho
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('pendiente_cliente')}
                      style={{ border: 'none', background: '#ffebee', color: '#c62828', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <AlertTriangle size={14} className="inline-block mr-1"/> Pedir Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('interno_equipo')}
                      style={{ border: 'none', background: '#e0f2f1', color: '#00695c', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <Settings size={14} className="inline-block mr-1"/> Interno
                    </button>
                  </div>
                </div>
                
                <textarea
                  required
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="custom-wizard-input"
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: '1.4' }}
                />
              </div>

              {emailSendStatus && (
                <div style={{ 
                  backgroundColor: emailSendStatus.loading ? '#e0f2f1' : emailSendStatus.success ? '#e8f5e9' : '#ffebee',
                  color: emailSendStatus.loading ? '#00695c' : emailSendStatus.success ? '#2e7d32' : '#c62828',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  {emailSendStatus.loading ? 'Enviando correo...' : emailSendStatus.msg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="custom-wizard-btn-back"
                  onClick={() => setEmailModalStep(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="custom-wizard-btn-next"
                  disabled={!!(emailSendStatus && emailSendStatus.loading)}
                  style={{
                    opacity: (emailSendStatus && emailSendStatus.loading) ? 0.5 : 1,
                    cursor: (emailSendStatus && emailSendStatus.loading) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Enviar Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
