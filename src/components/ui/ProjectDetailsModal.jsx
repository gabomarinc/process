import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Check, 
  Calendar, 
  User, 
  Users,
  Upload, 
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Trash2,
  ExternalLink,
  Mail,
  FileText,
  Clock,
  Sparkles,
  Send,
  CheckCircle2,
  Zap,
  Edit2,
  AlertCircle,
  AlertTriangle,
  ListChecks,
  Layers,
  ArrowRight,
  Tag,
  Sliders,
  RefreshCw,
  ChevronDown,
  Eye
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
  onUpdateInstanceNotes,
  onDeleteInstance,
  onAskAIForProjectSummary,
  handleStepComplete,
  handleAssignStepMember,
  handleUpdateStepComments,
  currentUser,
  fileStore = {},
  setFileStore,
  addToast
}) => {
  const [activeModalTab, setActiveModalTab] = useState('detalles'); // 'detalles', 'actividad', 'tareas', 'archivos', 'conversacion', 'calendario'
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [mentionSearch, setMentionSearch] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showTopAttachments, setShowTopAttachments] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Email sub-modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSendStatus, setEmailSendStatus] = useState(null);

  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  // Attachment free-upload state
  const [attachStepId, setAttachStepId] = useState('');
  const freeFileRef = useRef(null);
  const noteInputRef = useRef(null);

  useEffect(() => {
    if (activeInstance?.id) {
      setAiSummary('');
      setActiveModalTab('detalles');
      setNoteText('');
      setShowTopAttachments(false);
      setPreviewFile(null);
    }
  }, [activeInstance?.id]);

  if (!isOpen || !activeInstance) return null;

  const steps = activeInstance.steps || [];
  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.isCompleted).length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const instanceAttachments = activeInstance.attachments || [];
  const instanceNotes = activeInstance.notes || [];

  // Aggregate all attached files
  const allAttachments = [];
  instanceAttachments.forEach(att => {
    allAttachments.push({
      id: att.id,
      name: att.name,
      url: att.url,
      type: att.type || (att.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
      uploadedAt: att.uploadedAt,
      uploadedBy: att.uploadedBy,
      source: 'Adjunto General'
    });
  });

  steps.forEach(step => {
    const fileFromStore = fileStore?.[step.id];
    if (step.uploadedFileName || step.uploadedFileUrl || fileFromStore) {
      allAttachments.push({
        id: `step_${step.id}`,
        name: step.uploadedFileName || fileFromStore?.name || 'Documento adjunto',
        url: step.uploadedFileUrl || fileFromStore?.url || null,
        type: fileFromStore?.type || (step.uploadedFileName?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        uploadedAt: step.completedAt || step.dueDate || activeInstance.startedAt,
        uploadedBy: step.completedBy || 'Sistema / Paso',
        stepTitle: step.title,
        source: `Paso: ${step.title}`
      });
    }
  });

  const uniqueAttachments = [];
  const seenAttachmentKeys = new Set();
  allAttachments.forEach(att => {
    const key = att.url || att.name;
    if (!seenAttachmentKeys.has(key)) {
      seenAttachmentKeys.add(key);
      uniqueAttachments.push(att);
    }
  });

  // Get unique assigned members across all steps
  const assignedMemberIds = new Set();
  steps.forEach(step => {
    if (step.assignedTo && step.assignedTo !== 'Unassigned') {
      if (Array.isArray(step.assignedTo)) {
        step.assignedTo.forEach(id => assignedMemberIds.add(String(id)));
      } else {
        assignedMemberIds.add(String(step.assignedTo));
      }
    }
  });

  const involvedMembers = teamMembers.filter(m => 
    assignedMemberIds.has(String(m.id)) || assignedMemberIds.has(m.email)
  );

  // Calculate target final date from steps
  let finalDueDate = null;
  let hasOverdueSteps = false;
  if (steps.length > 0) {
    const dates = steps.filter(s => s.dueDate).map(s => new Date(s.dueDate).getTime());
    if (dates.length > 0) {
      finalDueDate = new Date(Math.max(...dates));
      const todayTime = new Date().setHours(0,0,0,0);
      hasOverdueSteps = steps.some(s => !s.isCompleted && s.dueDate && new Date(s.dueDate).getTime() < todayTime);
    }
  }

  // Helper for initial letters avatar
  const getInitials = (name = '') => {
    if (!name) return 'PR';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper for relative time formatting
  const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'Reciente';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? 'hace alrededor de 1 mes' : `hace ${months} meses`;
    }
    if (diffDays > 0) {
      return diffDays === 1 ? 'hace 1 día' : `hace ${diffDays} días`;
    }
    if (diffHours > 0) {
      return diffHours === 1 ? 'hace 1 hora' : `hace ${diffHours} horas`;
    }
    if (diffMin > 0) {
      return diffMin === 1 ? 'hace 1 minuto' : `hace ${diffMin} min`;
    }
    return 'hace unos momentos';
  };

  // Compile real activity feed
  const activityFeed = [];

  // 1. Start event
  if (activeInstance.startedAt) {
    activityFeed.push({
      id: `sys_start_${activeInstance.id}`,
      type: 'system',
      category: 'SISTEMA',
      title: `Proceso iniciado con plantilla "${activeInstance.title}"`,
      timestamp: activeInstance.startedAt,
      author: 'Sistema Kônsul',
      icon: 'zap'
    });
  }

  // 2. Notes directly on instance
  instanceNotes.forEach(note => {
    activityFeed.push({
      id: note.id,
      type: 'note',
      category: 'NOTA',
      title: note.text,
      timestamp: note.timestamp,
      author: note.author || 'Usuario',
      icon: 'file-text'
    });
  });

  // 3. Step comments
  steps.forEach(step => {
    (step.comments || []).forEach(comm => {
      activityFeed.push({
        id: comm.id,
        type: 'step_comment',
        category: 'NOTA',
        title: comm.text,
        subtext: `En el paso: "${step.title}"`,
        timestamp: comm.timestamp,
        author: comm.author || comm.userName || 'Colaborador',
        icon: 'file-text'
      });
    });
  });

  // 4. Completed steps
  steps.forEach(step => {
    if (step.isCompleted) {
      const assignedMember = teamMembers.find(m => String(m.id) === String(step.assignedTo));
      activityFeed.push({
        id: `step_done_${step.id}`,
        type: 'completion',
        category: 'SISTEMA',
        title: `Paso completado: "${step.title}"`,
        timestamp: step.completedAt || step.dueDate || activeInstance.startedAt,
        author: assignedMember?.name || currentUser?.name || 'Equipo Kônsul',
        icon: 'check'
      });
    }
  });

  // Sort activity feed by date descending
  activityFeed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Count of notes + comments
  const totalNotesCount = instanceNotes.length + steps.reduce((acc, s) => acc + (s.comments?.length || 0), 0);

  // Handlers
  const handleStatusChange = (newStatus) => {
    onUpdateInstanceStatus(activeInstance.id, newStatus);
  };

  const handleStepCompleteClick = (stepId, isChecked) => {
    handleStepComplete(activeInstance.id, stepId, isChecked, null);
  };

  const handleSaveNewNote = async (e) => {
    if (e) e.preventDefault();
    if (!noteText.trim()) return;

    const newNote = {
      id: `note_${Date.now()}`,
      text: noteText.trim(),
      author: currentUser?.name || 'Usuario',
      timestamp: new Date().toISOString()
    };

    const updatedNotes = [newNote, ...instanceNotes];
    if (onUpdateInstanceNotes) {
      await onUpdateInstanceNotes(activeInstance.id, updatedNotes);
    }
    setNoteText('');
    setMentionSearch(null);
    if (addToast) addToast('Nota registrada en el historial', 'success');
  };

  const handleConsultAI = async () => {
    setIsLoadingAI(true);
    setAiSummary('');
    try {
      const result = await onAskAIForProjectSummary(activeInstance);
      setAiSummary(result);
    } catch (e) {
      setAiSummary("No se pudo generar el análisis en este momento.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Free attachment upload
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
    if (addToast) addToast('Archivo adjuntado con éxito', 'success');
  };

  const handleDeleteAttachment = (attId) => {
    if (!window.confirm('¿Deseas eliminar este archivo adjunto?')) return;
    const updated = instanceAttachments.filter(a => a.id !== attId);
    if (onUpdateInstanceAttachments) onUpdateInstanceAttachments(activeInstance.id, updated);
  };

  // Email Send Handler
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
        msg: 'Configura tus credenciales SMTP en Ajustes > Mi Perfil para enviar correos.'
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
          html: `<div style="font-family: sans-serif; line-height: 1.5; color: #0F172A; padding: 20px; background: #F8FAFC;">
            <div style="background: #27BEA5; color: white; padding: 1.25rem; border-radius: 12px 12px 0 0;">
              <h2 style="margin: 0; font-size: 1.3rem;">Kônsul Process</h2>
            </div>
            <div style="padding: 1.5rem; background: white; border: 1px solid #E2E8F0; border-radius: 0 0 12px 12px; border-top: none;">
              <p style="white-space: pre-wrap; font-size: 0.95rem; color: #0F172A;">${emailBody.replace(/\n/g, '<br />')}</p>
            </div>
          </div>`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar correo.');

      setEmailSendStatus({ success: true, msg: '¡Correo enviado con éxito!' });
      setTimeout(() => {
        setIsEmailModalOpen(false);
        setEmailSendStatus(null);
      }, 1500);
    } catch (err) {
      setEmailSendStatus({ success: false, msg: err.message });
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const stepsWithDates = steps.filter(s => s.dueDate);
  const dateStepMap = {};
  stepsWithDates.forEach(step => {
    const key = step.dueDate.split('T')[0];
    if (!dateStepMap[key]) dateStepMap[key] = [];
    dateStepMap[key].push(step);
  });

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calMonth, calYear);
    const firstDay = getFirstDayOfMonth(calMonth, calYear);
    const startOffset = (firstDay + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    return (
      <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button
            onClick={() => {
              if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
              else setCalMonth(m => m - 1);
            }}
            style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', color: '#64748B' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
            {monthNames[calMonth]} {calYear}
          </span>
          <button
            onClick={() => {
              if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
              else setCalMonth(m => m + 1);
            }}
            style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', color: '#64748B' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
          {['Lu','Ma','Mi','Ju','Vi','Sa','Do'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            const dateKey = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const daySteps = dateStepMap[dateKey] || [];
            const isToday = dateKey === todayKey;
            const hasOverdue = daySteps.some(s => !s.isCompleted && new Date(s.dueDate) < today);
            const hasPending = daySteps.some(s => !s.isCompleted);

            let dotColor = null;
            if (daySteps.length > 0) {
              dotColor = hasOverdue ? '#EF4444' : hasPending ? '#27BEA5' : '#10B981';
            }

            return (
              <div
                key={dateKey}
                title={daySteps.map(s => s.title).join('\n')}
                style={{
                  minHeight: '40px',
                  borderRadius: '10px',
                  background: isToday ? '#27BEA5' : daySteps.length > 0 ? '#F0FDFA' : '#F8FAFC',
                  border: isToday ? 'none' : daySteps.length > 0 ? '1px solid #CCFBF1' : '1px solid #F1F5F9',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  padding: '4px',
                  cursor: daySteps.length > 0 ? 'pointer' : 'default'
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : daySteps.length > 0 ? 700 : 500, color: isToday ? 'white' : '#0F172A' }}>
                  {day}
                </span>
                {dotColor && (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isToday ? 'white' : dotColor }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Find index of current column in kanbanColumns
  const currentColIdx = kanbanColumns.findIndex(
    col => col.toLowerCase() === (activeInstance.status || 'Por hacer').toLowerCase()
  );
  const activeColIdx = currentColIdx >= 0 ? currentColIdx : 0;

  // Formatted start date
  const startedDateFormatted = activeInstance.startedAt 
    ? new Date(activeInstance.startedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Fecha no registrada';

  // Status score label
  const scoreNumber = progressPct;
  const scoreStatusLabel = progressPct === 100 ? 'Completado' : hasOverdueSteps ? 'Con Atraso' : progressPct > 0 ? 'En curso' : 'Por Iniciar';
  const scoreColor = progressPct === 100 ? '#10B981' : hasOverdueSteps ? '#EF4444' : '#27BEA5';

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, backdropFilter: 'blur(4px)', background: 'rgba(5, 15, 25, 0.7)' }} onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: '1050px',
          width: '95%',
          maxHeight: '92vh',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          background: '#F8FAFC',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ═══════════════════════════════════════════════════════════════
            TOP HEADER: Dark Emerald Gradient
        ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          background: 'radial-gradient(circle at top right, rgba(39, 190, 165, 0.22), transparent 45%), linear-gradient(135deg, #021a16 0%, #06312a 50%, #03201b 100%)',
          padding: '1.25rem 2rem 1.25rem 2rem',
          flexShrink: 0,
          color: '#FFFFFF',
          borderBottom: '1px solid rgba(39, 190, 165, 0.2)',
          position: 'relative'
        }}>
          {/* Top meta bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.82rem', color: '#94A3B8', fontWeight: 500, letterSpacing: '0.01em' }}>
                Iniciado el {startedDateFormatted}
              </span>
              {uniqueAttachments.length > 0 && (
                <button
                  onClick={() => setShowTopAttachments(!showTopAttachments)}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: showTopAttachments ? '#27BEA5' : 'rgba(255, 255, 255, 0.08)',
                    color: showTopAttachments ? '#031D19' : '#E2E8F0',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Ver archivos adjuntos del proceso"
                >
                  <Paperclip size={12} color={showTopAttachments ? '#031D19' : '#27BEA5'} />
                  <span>Adjuntos ({uniqueAttachments.length})</span>
                  <ChevronDown size={12} style={{ transform: showTopAttachments ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onDeleteInstance && (
                <button
                  onClick={() => {
                    if (window.confirm(`¿Estás seguro de eliminar el proceso "${activeInstance.instanceName}"?`)) {
                      onDeleteInstance(activeInstance.id);
                    }
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Eliminar Proceso"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Profile identity banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', marginBottom: '1.25rem', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: 0 }}>
              {/* Vibrant Squircle Avatar */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #FF5722 0%, #FF7043 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '1.45rem',
                fontWeight: 800,
                boxShadow: '0 8px 20px rgba(255, 87, 34, 0.35)',
                flexShrink: 0
              }}>
                {getInitials(activeInstance.instanceName)}
              </div>

              {/* Title & Metadata */}
              <div style={{ minWidth: 0 }}>
                <h1 style={{
                  margin: 0,
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {activeInstance.instanceName}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.82rem', color: '#94A3B8' }}>
                  <span style={{ color: '#27BEA5', fontWeight: 700 }}>{activeInstance.category || 'General'}</span>
                  <span>•</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Plantilla: {activeInstance.title}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress / Score Card on the right */}
            <div style={{
              background: 'rgba(3, 29, 25, 0.85)',
              border: '1px solid rgba(39, 190, 165, 0.3)',
              borderRadius: '18px',
              padding: '8px 18px',
              textAlign: 'center',
              minWidth: '95px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                {scoreNumber}%
              </div>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '3px' }}>
                PROGRESO
              </div>
              <div style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '99px',
                marginTop: '4px',
                background: progressPct === 100 ? 'rgba(16, 185, 129, 0.2)' : hasOverdueSteps ? 'rgba(239, 68, 68, 0.2)' : 'rgba(39, 190, 165, 0.2)',
                color: scoreColor
              }}>
                {scoreStatusLabel}
              </div>
            </div>
          </div>

          {/* Stepper / Pipeline Progress Trail */}
          <div style={{ marginTop: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ETAPA DEL PIPELINE
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>
                Haz clic para cambiar de estado
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', overflowX: 'auto', paddingBottom: '4px' }}>
              {kanbanColumns.map((col, idx) => {
                const isPassed = idx < activeColIdx;
                const isCurrent = idx === activeColIdx;

                return (
                  <React.Fragment key={idx}>
                    {/* Node */}
                    <div 
                      onClick={() => handleStatusChange(col)}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        minWidth: '70px',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isCurrent ? '#27BEA5' : isPassed ? '#06352E' : 'rgba(255,255,255,0.05)',
                        border: isCurrent ? '2px solid #27BEA5' : isPassed ? '2px solid #27BEA5' : '2px solid rgba(255,255,255,0.2)',
                        color: isCurrent ? '#021C18' : isPassed ? '#27BEA5' : 'rgba(255,255,255,0.4)',
                        boxShadow: isCurrent ? '0 0 15px rgba(39, 190, 165, 0.6)' : 'none',
                        transition: 'all 0.2s',
                        fontWeight: 800
                      }}>
                        {isPassed || isCurrent ? <Check size={16} strokeWidth={3} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />}
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: isCurrent ? 800 : 600,
                        color: isCurrent ? '#FFFFFF' : isPassed ? '#27BEA5' : '#94A3B8',
                        marginTop: '6px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        {col}
                      </span>
                    </div>

                    {/* Connecting Line */}
                    {idx < kanbanColumns.length - 1 && (
                      <div style={{
                        flex: 1,
                        minWidth: '20px',
                        height: '2px',
                        background: idx < activeColIdx ? '#27BEA5' : 'rgba(255,255,255,0.15)',
                        marginBottom: '20px',
                        transition: 'all 0.3s'
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Quick Action Pill Buttons Bar (Sober & Universal Lucide Icons) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (activeColIdx < kanbanColumns.length - 1) {
                  handleStatusChange(kanbanColumns[activeColIdx + 1]);
                } else {
                  setActiveModalTab('tareas');
                }
              }}
              style={{
                background: '#27BEA5',
                color: '#031D19',
                border: 'none',
                borderRadius: '99px',
                padding: '8px 18px',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(39, 190, 165, 0.4)'
              }}
            >
              <ArrowRight size={14} /> Avanzar Etapa
            </button>

            <button
              onClick={() => setActiveModalTab('conversacion')}
              style={{
                background: '#1C2938',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                borderRadius: '99px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={14} color="#27BEA5" /> Asistente IA
            </button>

            <button
              onClick={() => {
                setActiveModalTab('actividad');
                setTimeout(() => noteInputRef.current?.focus(), 100);
              }}
              style={{
                background: '#1C2938',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                borderRadius: '99px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <FileText size={14} /> Nueva Nota
            </button>

            <button
              onClick={() => setActiveModalTab('tareas')}
              style={{
                background: '#1C2938',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                borderRadius: '99px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <ListChecks size={14} /> Checklist ({completedSteps}/{totalSteps})
            </button>

            <button
              onClick={() => {
                setEmailSubject(`[Proceso: ${activeInstance.instanceName}] Notificación de Seguimiento`);
                setEmailBody(`Hola,\n\nTe informamos que el proceso "${activeInstance.instanceName}" se encuentra actualmente en la etapa "${activeInstance.status || 'Por hacer'}" con un avance del ${progressPct}%.\n\nSaludos cordiales.`);
                setIsEmailModalOpen(true);
              }}
              style={{
                background: '#1C2938',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                borderRadius: '99px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Mail size={14} /> Notificar por Email
            </button>

            <button
              onClick={() => setActiveModalTab('calendario')}
              style={{
                background: '#1C2938',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                borderRadius: '99px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Calendar size={14} /> Calendario
            </button>
          </div>
        </div>

        {/* Collapsible Top Attachments Drawer */}
        {showTopAttachments && uniqueAttachments.length > 0 && (
          <div style={{
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '0.85rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease-in-out',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Documentos y Archivos Adjuntos ({uniqueAttachments.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {uniqueAttachments.map((att, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <FileText size={14} color="#27BEA5" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.name}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>
                      {att.source}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                    <button
                      onClick={() => setPreviewFile({ url: att.url, name: att.name, type: att.type || (att.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : null) })}
                      style={{
                        background: '#F1F5F9',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        color: '#0F172A',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Previsualizar"
                    >
                      <Eye size={12} /> Ver
                    </button>
                    {att.url && (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.name}
                        style={{
                          background: '#F1F5F9',
                          borderRadius: '6px',
                          padding: '3px 6px',
                          color: '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          textDecoration: 'none'
                        }}
                        title="Abrir o descargar"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TABS BAR: Crisp SaaS Nav
        ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 2rem',
          display: 'flex',
          gap: '1.5rem',
          flexShrink: 0,
          overflowX: 'auto'
        }}>
          {[
            { key: 'detalles', label: 'Detalles' },
            { key: 'actividad', label: 'Actividad', badge: totalNotesCount },
            { key: 'tareas', label: 'Tareas', badge: `${completedSteps}/${totalSteps}` },
            { key: 'archivos', label: 'Archivos', badge: instanceAttachments.length > 0 ? instanceAttachments.length : null },
            { key: 'conversacion', label: 'Asistente IA' },
            { key: 'calendario', label: 'Calendario' }
          ].map(({ key, label, badge }) => {
            const isActive = activeModalTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveModalTab(key)}
                style={{
                  padding: '1rem 0.25rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #27BEA5' : '3px solid transparent',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#0F172A' : '#64748B',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                <span>{label}</span>
                {badge !== null && badge !== undefined && (
                  <span style={{
                    background: key === 'actividad' ? '#EF4444' : isActive ? '#E6FFFA' : '#F1F5F9',
                    color: key === 'actividad' ? '#FFFFFF' : isActive ? '#27BEA5' : '#64748B',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '99px',
                    lineHeight: 1
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SCROLLABLE TAB CONTENT
        ═══════════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem', minHeight: 0 }}>

          {/* ───────────────────────────────────────────────────────────
              TAB 1: DETALLES (Real Process & Workflow data)
          ─────────────────────────────────────────────────────────── */}
          {activeModalTab === 'detalles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '920px' }}>
              
              {/* Card 1: INFORMACIÓN DEL PROCESO */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                {/* Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: '#E6FFFA',
                    color: '#27BEA5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Layers size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    INFORMACIÓN DEL PROCESO
                  </h3>
                </div>

                {/* 2x3 Field Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {/* Process Name */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <FileText size={12} /> NOMBRE DE LA EJECUCIÓN
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeInstance.instanceName}
                    </div>
                  </div>

                  {/* Template Base */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <Sliders size={12} /> PLANTILLA BASE
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#27BEA5', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeInstance.title}
                    </div>
                  </div>

                  {/* Category */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <Tag size={12} /> CATEGORÍA
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
                      {activeInstance.category || 'Operaciones'}
                    </div>
                  </div>

                  {/* Started At */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <Clock size={12} /> FECHA DE INICIO
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
                      {startedDateFormatted}
                    </div>
                  </div>

                  {/* Pipeline Status Selector */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      ESTADO ACTUAL
                    </div>
                    <select
                      value={activeInstance.status || 'Por hacer'}
                      onChange={e => handleStatusChange(e.target.value)}
                      style={{
                        marginTop: '6px',
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {kanbanColumns.map((col, idx) => (
                        <option key={idx} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Selector */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      PRIORIDAD
                    </div>
                    <select
                      value={activeInstance.priority || 'Media'}
                      onChange={e => onUpdateInstancePriority && onUpdateInstancePriority(activeInstance.id, e.target.value)}
                      style={{
                        marginTop: '6px',
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 2: EQUIPO Y SEGUIMIENTO */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                {/* Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: '#EFF6FF',
                    color: '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Users size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    EQUIPO Y SEGUIMIENTO DEL PROCESO
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {/* Involved Members */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      COLABORADORES INVOLUCRADOS ({involvedMembers.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {involvedMembers.map((m, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#27BEA5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                            <User size={10} />
                          </div>
                          <span>{m.name}</span>
                        </div>
                      ))}
                      {involvedMembers.length === 0 && (
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic' }}>Sin miembros asignados a los pasos aún</span>
                      )}
                    </div>
                  </div>

                  {/* AI Companion Guide */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      GUÍA / ASISTENTE VIRTUAL
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} color="#27BEA5" />
                      <span>{activeInstance.companionName || 'Asistente de Procesos Kônsul'}</span>
                    </div>
                  </div>

                  {/* Final target date */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      FECHA ESTIMADA DE FINALIZACIÓN
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: hasOverdueSteps ? '#EF4444' : '#0F172A', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color={hasOverdueSteps ? '#EF4444' : '#64748B'} />
                      <span>{finalDueDate ? finalDueDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha límite'}</span>
                      {hasOverdueSteps && <span style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 700 }}>(Pasos vencidos)</span>}
                    </div>
                  </div>

                  {/* Overall progress */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      AVANCE TOTAL
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#27BEA5', marginTop: '6px' }}>
                      {completedSteps} de {totalSteps} pasos ({progressPct}%)
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              TAB 2: ACTIVIDAD (Real Activity Timeline & Notes)
          ─────────────────────────────────────────────────────────── */}
          {activeModalTab === 'actividad' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '920px' }}>
              
              {/* Nueva Nota Box */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                    <FileText size={16} color="#27BEA5" />
                    <span>Nueva nota</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    Escribe @ para etiquetar a un compañero
                  </span>
                </div>

                <div style={{ position: 'relative' }}>
                  {mentionSearch && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      zIndex: 50,
                      maxHeight: '130px',
                      overflowY: 'auto',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}>
                      {teamMembers
                        .filter(m => m.name.toLowerCase().includes(mentionSearch.query.toLowerCase()))
                        .map(m => (
                          <div
                            key={m.id}
                            onClick={() => {
                              const words = noteText.split(' ');
                              words.pop();
                              setNoteText([...words, `@${m.name} `].join(' '));
                              setMentionSearch(null);
                              noteInputRef.current?.focus();
                            }}
                            style={{ padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}
                          >
                            <strong>{m.name}</strong>
                            <span style={{ color: '#94A3B8', fontSize: '0.7rem' }}>{m.role}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  <textarea
                    ref={noteInputRef}
                    placeholder="Escribe una nota o actualización sobre este proceso... usa @ para etiquetar a alguien"
                    value={noteText}
                    onChange={e => {
                      const val = e.target.value;
                      setNoteText(val);
                      const lastWord = val.split(/\s+/).pop();
                      if (lastWord && lastWord.startsWith('@')) {
                        setMentionSearch({ query: lastWord.substring(1) });
                      } else {
                        setMentionSearch(null);
                      }
                    }}
                    onKeyDown={e => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        handleSaveNewNote();
                      }
                    }}
                    style={{
                      width: '100%',
                      minHeight: '90px',
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.9rem',
                      color: '#0F172A',
                      resize: 'none',
                      background: 'transparent',
                      lineHeight: '1.5'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    ⌘ + Enter para guardar
                  </span>
                  <button
                    onClick={handleSaveNewNote}
                    style={{
                      background: '#27BEA5',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '99px',
                      padding: '8px 20px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(39, 190, 165, 0.3)'
                    }}
                  >
                    <Send size={13} /> Guardar nota
                  </button>
                </div>
              </div>

              {/* HISTORIAL DE ACTIVIDAD */}
              <div>
                <h3 style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#64748B',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '1.25rem'
                }}>
                  HISTORIAL DE ACTIVIDAD
                </h3>

                <div style={{ position: 'relative', paddingLeft: '2.5rem' }}>
                  {/* Vertical connecting line */}
                  <div style={{
                    position: 'absolute',
                    left: '17px',
                    top: '15px',
                    bottom: '20px',
                    width: '2px',
                    background: '#E2E8F0'
                  }} />

                  {/* Activity List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {activityFeed.map(item => {
                      const isSystem = item.type === 'system' || item.type === 'completion';
                      const isNote = item.type === 'note' || item.type === 'step_comment';

                      return (
                        <div key={item.id} style={{ position: 'relative' }}>
                          {/* Node Icon Circle */}
                          <div style={{
                            position: 'absolute',
                            left: '-2.5rem',
                            top: '10px',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: item.type === 'completion' ? '#F0FDF4' : isSystem ? '#FAF5FF' : '#EFF6FF',
                            color: item.type === 'completion' ? '#10B981' : isSystem ? '#A855F7' : '#3B82F6',
                            border: '3px solid #FFFFFF',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            zIndex: 2
                          }}>
                            {item.type === 'completion' ? <CheckCircle2 size={16} /> : isSystem ? <Zap size={16} /> : <FileText size={16} />}
                          </div>

                          {/* Event Card */}
                          <div style={{
                            background: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #E2E8F0',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}>
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                {item.category}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                  {getRelativeTime(item.timestamp)}
                                </span>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', lineHeight: '1.4' }}>
                              {item.title}
                            </div>
                            {item.subtext && (
                              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                                {item.subtext}
                              </div>
                            )}

                            {/* Author Pill */}
                            {item.author && (
                              <div style={{
                                marginTop: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#F8FAFC',
                                border: '1px solid #F1F5F9',
                                padding: '3px 10px',
                                borderRadius: '99px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#27BEA5'
                              }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#27BEA5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem' }}>
                                  <User size={10} />
                                </div>
                                <span>{item.author}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {activityFeed.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontStyle: 'italic' }}>
                        Sin actividad registrada aún.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              TAB 3: TAREAS / CHECKLIST
          ─────────────────────────────────────────────────────────── */}
          {activeModalTab === 'tareas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '920px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                    Pasos del Proceso ({completedSteps} de {totalSteps})
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    {progressPct}% completado
                  </span>
                </div>
                <div style={{ width: '140px', height: '8px', background: '#F1F5F9', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: '#27BEA5', borderRadius: '99px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {steps.map(step => {
                  const isExpanded = expandedStepId === step.id;
                  const isOverdue = step.dueDate && new Date(step.dueDate) < today && !step.isCompleted;

                  return (
                    <div
                      key={step.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div
                        onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                        style={{
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          onClick={e => {
                            e.stopPropagation();
                            handleStepCompleteClick(step.id, !step.isCompleted);
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '8px',
                            border: `2px solid ${step.isCompleted ? '#27BEA5' : isOverdue ? '#EF4444' : '#CBD5E1'}`,
                            background: step.isCompleted ? '#27BEA5' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {step.isCompleted && <Check size={14} strokeWidth={3} />}
                        </div>

                        {/* Title & Metadata */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: step.isCompleted ? '#94A3B8' : '#0F172A',
                            textDecoration: step.isCompleted ? 'line-through' : 'none'
                          }}>
                            {step.title}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: '#64748B', flexWrap: 'wrap' }}>
                            {step.dueDate && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isOverdue ? '#EF4444' : 'inherit', fontWeight: isOverdue ? 700 : 500 }}>
                                <Calendar size={12} /> {new Date(step.dueDate).toLocaleDateString('es-ES')}
                                {isOverdue && ' (Vencido)'}
                              </span>
                            )}
                            {step.assignedTo && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={12} /> {teamMembers.find(m => String(m.id) === String(step.assignedTo))?.name || 'Asignado'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badges / Expand */}
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '99px',
                          background: step.type === 'digital' ? '#EFF6FF' : '#F1F5F9',
                          color: step.type === 'digital' ? '#3B82F6' : '#64748B'
                        }}>
                          {step.type === 'digital' ? 'Acción Digital' : 'Paso Manual'}
                        </span>
                      </div>

                      {/* Expanded Step Details */}
                      {isExpanded && (
                        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                          <div style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: '1.5' }}>
                            {step.description || 'Sin descripción adicional para este paso.'}
                          </div>

                          {step.motivation && (
                            <div style={{ display: 'flex', gap: '8px', background: '#F0FDFA', border: '1px solid #CCFBF1', padding: '0.75rem', borderRadius: '12px', marginTop: '0.75rem', color: '#0F172A', fontSize: '0.8rem' }}>
                              <Lightbulb size={16} color="#27BEA5" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div><strong>¿Por qué este paso?:</strong> {step.motivation}</div>
                            </div>
                          )}

                          {/* File upload if digital step */}
                          {step.type === 'digital' && !step.isCompleted && (
                            <div style={{ marginTop: '1rem' }}>
                              <label style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#27BEA5',
                                color: 'white',
                                padding: '6px 14px',
                                borderRadius: '10px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}>
                                <Upload size={14} /> Subir archivo ({step.acceptedFormats?.join(', ') || 'PDF, Imagen'})
                                <input
                                  type="file"
                                  style={{ display: 'none' }}
                                  accept={step.acceptedFormats?.join(',')}
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const url = URL.createObjectURL(file);
                                      setFileStore(prev => ({ ...prev, [step.id]: { url, name: file.name, type: file.type } }));
                                      handleStepComplete(activeInstance.id, step.id, true, file.name);
                                      if (addToast) addToast(`Archivo "${file.name}" cargado y paso completado`, 'success');
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              TAB 4: ARCHIVOS
          ─────────────────────────────────────────────────────────── */}
          {activeModalTab === 'archivos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '920px' }}>
              {/* Upload Zone */}
              <div style={{
                background: '#FFFFFF',
                border: '2px dashed #CBD5E1',
                borderRadius: '20px',
                padding: '1.75rem',
                textAlign: 'center'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#E6FFFA', color: '#27BEA5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
                  <Upload size={22} />
                </div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  Subir nuevo archivo o entregable
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Soporta PDFs, imágenes, hojas de cálculo y documentos del proceso.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <label style={{
                    background: '#27BEA5',
                    color: '#FFFFFF',
                    padding: '8px 18px',
                    borderRadius: '99px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Paperclip size={14} /> Seleccionar Archivo
                    <input
                      ref={freeFileRef}
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => {
                        Array.from(e.target.files || []).forEach(file => handleFreeAttachmentUpload(file));
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Attachments List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  DOCUMENTOS Y ADJUNTOS ({instanceAttachments.length})
                </h3>

                {instanceAttachments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#94A3B8', fontStyle: 'italic' }}>
                    No hay archivos adjuntos en este proceso aún.
                  </div>
                ) : (
                  instanceAttachments.map(att => (
                    <div
                      key={att.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {att.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                            Subido por {att.uploadedBy} • {new Date(att.uploadedAt).toLocaleDateString('es-ES')}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '6px 12px',
                            background: '#F1F5F9',
                            color: '#0F172A',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ExternalLink size={12} /> Abrir
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          style={{
                            padding: '6px 10px',
                            background: '#FEE2E2',
                            color: '#EF4444',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              TAB 5: ASISTENTE IA (Gemini)
          ─────────────────────────────────────────────────────────── */}
          {activeModalTab === 'conversacion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '920px' }}>
              <div style={{
                background: 'radial-gradient(circle at top right, rgba(39, 190, 165, 0.15), transparent 60%), #FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={20} color="#27BEA5" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                      Asistente Inteligente Gemini
                    </h3>
                  </div>
                  <button
                    onClick={handleConsultAI}
                    disabled={isLoadingAI}
                    style={{
                      background: '#27BEA5',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '99px',
                      padding: '6px 16px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: isLoadingAI ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RefreshCw size={13} className={isLoadingAI ? 'animate-spin' : ''} />
                    {isLoadingAI ? 'Analizando...' : aiSummary ? 'Actualizar Análisis' : 'Analizar Estado'}
                  </button>
                </div>

                {isLoadingAI ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', fontSize: '0.9rem' }}>
                    Gemini está analizando los pasos, colaboradores y plazos de este proceso...
                  </div>
                ) : aiSummary ? (
                  <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '16px', padding: '1.25rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#0F172A', lineHeight: '1.6' }}>
                    {aiSummary}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B', lineHeight: '1.5' }}>
                    Solicita un análisis inteligente en tiempo real sobre el estado de este proceso. Gemini identificará cuellos de botella, pasos críticos y sugerirá la siguiente acción clave para el equipo.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              TAB 6: CALENDARIO
          ─────────────────────────────────────────────────────────── */}
          {activeModalTab === 'calendario' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '920px' }}>
              {renderCalendar()}
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SUB-MODAL: ENVIAR EMAIL DE NOTIFICACIÓN
      ═══════════════════════════════════════════════════════════════ */}
      {isEmailModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)' }} onClick={() => setIsEmailModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '600px', width: '90%', padding: '1.75rem', background: '#FFFFFF', borderRadius: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={18} color="#27BEA5" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Enviar Correo de Notificación
                </h3>
              </div>
              <button className="close-btn-aesthetic" onClick={() => setIsEmailModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Destinatario</label>
                <input
                  type="email"
                  required
                  placeholder="destinatario@correo.com"
                  value={emailRecipient}
                  onChange={e => setEmailRecipient(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Asunto</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Mensaje</label>
                <textarea
                  required
                  rows={5}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {emailSendStatus && (
                <div style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', background: emailSendStatus.success ? '#F0FDF4' : '#FEF2F2', color: emailSendStatus.success ? '#10B981' : '#EF4444' }}>
                  {emailSendStatus.msg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEmailModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={emailSendStatus?.loading}>
                  {emailSendStatus?.loading ? 'Enviando...' : 'Enviar Notificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SUB-MODAL: PREVIEW DE ARCHIVO / DOCUMENTO
      ═══════════════════════════════════════════════════════════════ */}
      {previewFile && (
        <div className="modal-overlay" style={{ zIndex: 1150, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }} onClick={() => setPreviewFile(null)}>
          <div className="modal-card" style={{ maxWidth: '750px', width: '92%', padding: '1.5rem', background: '#FFFFFF', borderRadius: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#27BEA5" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                  Previsualización del Archivo
                </h3>
              </div>
              <button className="close-btn-aesthetic" onClick={() => setPreviewFile(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
              {previewFile.url ? (
                previewFile.type && previewFile.type.startsWith('image/') ? (
                  <img 
                    src={previewFile.url} 
                    alt={previewFile.name} 
                    style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '12px', objectFit: 'contain', border: '1px solid #E2E8F0' }} 
                  />
                ) : (previewFile.type === 'application/pdf' || previewFile.name?.toLowerCase().endsWith('.pdf') || previewFile.url?.toLowerCase().includes('.pdf')) ? (
                  <iframe 
                    src={previewFile.url} 
                    title={previewFile.name} 
                    style={{ width: '100%', height: '420px', borderRadius: '12px', border: '1px solid #E2E8F0' }} 
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', width: '100%' }}>
                    <FileText size={48} color="#27BEA5" style={{ margin: '0 auto 0.75rem' }} />
                    <h4 style={{ margin: '0 0 0.5rem 0', wordBreak: 'break-all', fontSize: '1rem', color: '#0F172A' }}>{previewFile.name}</h4>
                    <span style={{ fontSize: '0.75rem', background: '#E2E8F0', padding: '3px 10px', borderRadius: '99px', fontWeight: 700 }}>
                      {previewFile.type || 'Documento adjunto'}
                    </span>
                  </div>
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1.5rem', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', width: '100%' }}>
                  <FileText size={48} color="#27BEA5" style={{ margin: '0 auto 0.75rem' }} />
                  <h4 style={{ margin: '0 0 0.5rem 0', wordBreak: 'break-all', fontSize: '1rem', color: '#0F172A' }}>{previewFile.name}</h4>
                  <span style={{ fontSize: '0.75rem', background: '#E2E8F0', padding: '3px 10px', borderRadius: '99px', fontWeight: 700 }}>
                    Archivo cargado correctamente
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                {previewFile.url && (
                  <a 
                    href={previewFile.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    download={previewFile.name} 
                    style={{
                      textDecoration: 'none',
                      background: '#27BEA5',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ExternalLink size={13} /> Abrir / Descargar
                  </a>
                )}
                <button 
                  onClick={() => setPreviewFile(null)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    color: '#0F172A',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
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
    </div>
  );
};
