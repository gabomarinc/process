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
  Eye,
  ShieldAlert,
  CheckSquare,
  BarChart2,
  Flag,
  Target,
  Timer
} from 'lucide-react';
import { getBlockingChecklistItemsForInstance } from '../../utils/clientSemaforo';

const getFileType = (name, fallbackType) => {
  if (fallbackType && fallbackType !== 'application/octet-stream') return fallbackType;
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return fallbackType || 'application/octet-stream';
};

const getEffectiveAcceptedFormats = (acceptedFormats) => {
  const defaults = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
  if (!acceptedFormats || !Array.isArray(acceptedFormats) || acceptedFormats.length === 0) {
    return defaults;
  }
  const set = new Set(acceptedFormats.map(f => f.toLowerCase().trim()));
  set.add('.png');
  set.add('.jpg');
  set.add('.jpeg');
  return Array.from(set);
};

const getAcceptString = (formats) => {
  const eff = getEffectiveAcceptedFormats(formats);
  return [...eff, 'image/png', 'image/jpeg', 'image/*'].join(',');
};

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
  addToast,
  clients = [],
  onOpenClientChecklist,
  handleToggleStepChecklist
}) => {
  const blockingItems = getBlockingChecklistItemsForInstance(activeInstance, clients);
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
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [calendarSubTab, setCalendarSubTab] = useState('both'); // 'both', 'calendar', 'gantt'

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
      setSelectedCalendarDay(null);
      setCalendarSubTab('both');
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
      type: getFileType(att.name, att.type),
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
        type: getFileType(step.uploadedFileName || fileFromStore?.name, fileFromStore?.type),
        uploadedAt: step.completedAt || step.dueDate || activeInstance.startedAt,
        uploadedBy: step.completedBy || 'Sistema / Paso',
        stepTitle: step.title,
        source: `Paso: ${step.title}`
      });
    }
    (step.checklist || []).forEach((chk, cIdx) => {
      if (!chk || typeof chk !== 'object') return;
      const chkId = chk.id || cIdx;
      const chkStoreKey = `${step.id}_${chkId}`;
      const chkFileFromStore = fileStore?.[chkStoreKey];
      if (chk.uploadedFileName || chk.uploadedFileUrl || chkFileFromStore) {
        allAttachments.push({
          id: `chk_${step.id}_${chkId}`,
          name: chk.uploadedFileName || chkFileFromStore?.name || 'Adjunto de verificación',
          url: chk.uploadedFileUrl || chkFileFromStore?.url || null,
          type: getFileType(chk.uploadedFileName || chkFileFromStore?.name, chkFileFromStore?.type),
          uploadedAt: chk.uploadedAt || step.completedAt || activeInstance.startedAt,
          uploadedBy: step.completedBy || 'Checklist',
          stepTitle: `${step.title} › ${chk.text || 'Verificación'}`,
          source: `Checklist: ${chk.text || step.title}`
        });
      }
    });
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
  const handleFreeAttachmentUpload = async (file) => {
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

    // Background upload to Google Drive
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result || '').toString().split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (base64Data && activeInstance?.id) {
        const res = await fetch('/api/integrations/google-drive/upload-step-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            instanceId: activeInstance.id,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64Data
          })
        });
        const data = await res.json().catch(() => ({}));
        if (data.webViewLink) {
          const driveUpdated = updated.map(a => a.id === newAttachment.id ? { ...a, url: data.webViewLink, driveFileId: data.fileId } : a);
          if (onUpdateInstanceAttachments) onUpdateInstanceAttachments(activeInstance.id, driveUpdated);
          if (addToast) addToast(`"${file.name}" respaldado en Google Drive`, 'success');
        }
      }
    } catch (_) {}
  };

  const handleDeleteAttachment = (attId) => {
    if (!window.confirm('¿Deseas eliminar este archivo adjunto?')) return;
    const updated = instanceAttachments.filter(a => a.id !== attId);
    if (onUpdateInstanceAttachments) onUpdateInstanceAttachments(activeInstance.id, updated);
  };

  const handleUploadStepChecklistWithDrive = async (step, chkId, file, chkText) => {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    const storeKey = `${step.id}_${chkId}`;
    if (setFileStore) {
      setFileStore(prev => ({ ...prev, [storeKey]: { url: localUrl, name: file.name, type: file.type } }));
    }
    if (handleToggleStepChecklist) {
      await handleToggleStepChecklist(activeInstance.id, step.id, chkId, {
        isCompleted: true,
        uploadedFileName: file.name,
        uploadedFileUrl: localUrl,
        fileType: file.type
      });
    }
    if (addToast) addToast(`Archivo "${file.name}" adjuntado a "${chkText}"`, 'success');

    // Background upload to Google Drive
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result || '').toString().split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (base64Data && activeInstance?.id) {
        const res = await fetch('/api/integrations/google-drive/upload-step-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            instanceId: activeInstance.id,
            stepId: step.id,
            checklistItemId: chkId,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64Data
          })
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.webViewLink) {
            if (setFileStore) {
              setFileStore(prev => ({
                ...prev,
                [storeKey]: { url: data.webViewLink, name: file.name, type: file.type }
              }));
            }
            if (handleToggleStepChecklist) {
              await handleToggleStepChecklist(activeInstance.id, step.id, chkId, {
                isCompleted: true,
                uploadedFileName: file.name,
                uploadedFileUrl: data.webViewLink,
                fileType: file.type
              });
            }
            if (addToast) addToast(`☁️ "${file.name}" sincronizado en Google Drive`, 'success');
          }
        }
      }
    } catch (_) {}
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

  // Calendar & Gantt Schedule Helpers
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const projectStartDate = activeInstance.startedAt ? new Date(activeInstance.startedAt) : new Date();

  // Calculate detailed timeline, start date and end date for each step
  const scheduledSteps = steps.map((step, idx) => {
    let dueDateObj = step.dueDate ? new Date(step.dueDate) : null;
    let startDateObj = step.startDate ? new Date(step.startDate) : null;

    if (!dueDateObj) {
      const offsetDays = typeof step.relativeOffsetDays === 'number' ? step.relativeOffsetDays : (idx + 1);
      dueDateObj = new Date(projectStartDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    }

    if (!startDateObj) {
      if (idx === 0) {
        startDateObj = new Date(projectStartDate.getTime());
      } else {
        const prevStep = steps[idx - 1];
        if (prevStep?.dueDate) {
          startDateObj = new Date(prevStep.dueDate);
        } else {
          startDateObj = new Date(dueDateObj.getTime() - 24 * 60 * 60 * 1000);
        }
      }
    }

    // Ensure start date is before or equal to due date
    if (startDateObj > dueDateObj) {
      startDateObj = new Date(dueDateObj.getTime() - 24 * 60 * 60 * 1000);
    }

    const durationDays = Math.max(1, Math.round((dueDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)));
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const dueTime = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate()).getTime();
    const startTime = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate()).getTime();

    const isOverdue = !step.isCompleted && dueTime < todayTime;
    const isDueToday = dueTime === todayTime;
    const isStartsToday = startTime === todayTime;

    let status = 'upcoming';
    let statusLabel = 'Programado';
    let statusColor = '#64748B';
    let statusBg = '#F1F5F9';
    let statusBorder = '#E2E8F0';

    if (step.isCompleted) {
      status = 'completed';
      statusLabel = 'Completado';
      statusColor = '#10B981';
      statusBg = '#ECFDF5';
      statusBorder = '#A7F3D0';
    } else if (isOverdue) {
      status = 'overdue';
      statusLabel = 'Atrasado';
      statusColor = '#EF4444';
      statusBg = '#FEF2F2';
      statusBorder = '#FECACA';
    } else if (todayTime >= startTime && todayTime <= dueTime) {
      status = 'in_progress';
      statusLabel = 'En curso';
      statusColor = '#27BEA5';
      statusBg = '#F0FDFA';
      statusBorder = '#99F6E4';
    }

    const assignedMember = teamMembers.find(m => String(m.id) === String(step.assignedTo) || m.email === step.assignedTo);

    return {
      ...step,
      stepIndex: idx + 1,
      startDateObj,
      dueDateObj,
      durationDays,
      status,
      statusLabel,
      statusColor,
      statusBg,
      statusBorder,
      isOverdue,
      isDueToday,
      isStartsToday,
      assignedMember
    };
  });

  // Calculate project boundary dates for Gantt rail
  const allStartTimes = scheduledSteps.map(s => s.startDateObj.getTime());
  const allEndTimes = scheduledSteps.map(s => s.dueDateObj.getTime());
  const minProjectTime = allStartTimes.length > 0 ? Math.min(...allStartTimes) : projectStartDate.getTime();
  const maxProjectTime = allEndTimes.length > 0 ? Math.max(...allEndTimes) : projectStartDate.getTime() + 7 * 24 * 60 * 60 * 1000;
  const totalProjectSpanMs = Math.max(24 * 60 * 60 * 1000, maxProjectTime - minProjectTime);
  const totalProjectDays = Math.max(1, Math.round(totalProjectSpanMs / (1000 * 60 * 60 * 24)));

  // Deliverables by calendar date key (YYYY-MM-DD)
  const dateDeliverableMap = {};
  scheduledSteps.forEach(step => {
    const dueKey = `${step.dueDateObj.getFullYear()}-${String(step.dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(step.dueDateObj.getDate()).padStart(2, '0')}`;
    const startKey = `${step.startDateObj.getFullYear()}-${String(step.startDateObj.getMonth() + 1).padStart(2, '0')}-${String(step.startDateObj.getDate()).padStart(2, '0')}`;

    if (!dateDeliverableMap[dueKey]) dateDeliverableMap[dueKey] = { due: [], start: [] };
    dateDeliverableMap[dueKey].due.push(step);

    if (!dateDeliverableMap[startKey]) dateDeliverableMap[startKey] = { due: [], start: [] };
    dateDeliverableMap[startKey].start.push(step);
  });

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calMonth, calYear);
    const firstDay = getFirstDayOfMonth(calMonth, calYear);
    const startOffset = (firstDay + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const formattedProjectStart = new Date(minProjectTime).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    const formattedProjectEnd = new Date(maxProjectTime).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

    // Today indicator position on the global timeline
    const todayTimestamp = today.getTime();
    const todayOffsetPercent = Math.max(0, Math.min(100, ((todayTimestamp - minProjectTime) / totalProjectSpanMs) * 100));
    const isTodayWithinProject = todayTimestamp >= minProjectTime && todayTimestamp <= maxProjectTime;

    // Selected day deliverables
    const selectedDayData = selectedCalendarDay ? (dateDeliverableMap[selectedCalendarDay] || { due: [], start: [] }) : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        {/* Top Control Bar & Mode Toggles */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#27BEA5" />
              <span>Cronograma & Calendario de Entregables</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              Proceso: <strong>{activeInstance.instanceName}</strong> • {totalSteps} pasos planificados
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '4px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <button
              onClick={() => setCalendarSubTab('both')}
              style={{
                background: calendarSubTab === 'both' ? '#FFFFFF' : 'transparent',
                color: calendarSubTab === 'both' ? '#0F172A' : '#64748B',
                boxShadow: calendarSubTab === 'both' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Layers size={13} /> Vista Completa
            </button>
            <button
              onClick={() => setCalendarSubTab('calendar')}
              style={{
                background: calendarSubTab === 'calendar' ? '#FFFFFF' : 'transparent',
                color: calendarSubTab === 'calendar' ? '#0F172A' : '#64748B',
                boxShadow: calendarSubTab === 'calendar' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Calendar size={13} /> Calendario Mensual
            </button>
            <button
              onClick={() => setCalendarSubTab('gantt')}
              style={{
                background: calendarSubTab === 'gantt' ? '#FFFFFF' : 'transparent',
                color: calendarSubTab === 'gantt' ? '#0F172A' : '#64748B',
                boxShadow: calendarSubTab === 'gantt' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <BarChart2 size={13} /> Gantt Simplificado
            </button>
          </div>
        </div>

        {/* Global Process Metrics Pill Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '10px'
        }}>
          <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flag size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>DÍA QUE INICIA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>{formattedProjectStart}</div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F0FDF4', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>DÍA QUE ACABA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>{formattedProjectEnd}</div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Timer size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>DURACIÓN TOTAL</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>{totalProjectDays} {totalProjectDays === 1 ? 'día' : 'días'}</div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#E6FFFA', color: '#27BEA5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>AVANCE EJECUCIÓN</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#27BEA5' }}>{completedSteps} de {totalSteps} completados ({progressPct}%)</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1: CALENDARIO MENSUAL CON ENTREGABLES DIARIOS
        ═══════════════════════════════════════════════════════════════ */}
        {(calendarSubTab === 'both' || calendarSubTab === 'calendar') && (
          <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            {/* Header with Month Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                    else setCalMonth(m => m - 1);
                  }}
                  style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', padding: '7px 12px', borderRadius: '8px', color: '#64748B', display: 'flex', alignItems: 'center' }}
                  title="Mes anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', minWidth: '150px', textAlign: 'center' }}>
                  {monthNames[calMonth]} {calYear}
                </span>
                <button
                  onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                    else setCalMonth(m => m + 1);
                  }}
                  style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', padding: '7px 12px', borderRadius: '8px', color: '#64748B', display: 'flex', alignItems: 'center' }}
                  title="Mes siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    setCalMonth(today.getMonth());
                    setCalYear(today.getFullYear());
                  }}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Mes Actual
                </button>
                {selectedCalendarDay && (
                  <button
                    onClick={() => setSelectedCalendarDay(null)}
                    style={{
                      background: '#FEE2E2',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      color: '#DC2626',
                      cursor: 'pointer'
                    }}
                  >
                    Deseleccionar día
                  </button>
                )}
              </div>
            </div>

            {/* Weekday Labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '8px' }}>
              {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', padding: '4px 0', textTransform: 'uppercase' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {cells.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} style={{ minHeight: '92px', background: '#FAFAFA', borderRadius: '12px', border: '1px dashed #F1F5F9' }} />;
                
                const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const deliverables = dateDeliverableMap[dateKey] || { due: [], start: [] };
                const isToday = dateKey === todayKey;
                const isSelected = selectedCalendarDay === dateKey;
                const hasDeliverables = deliverables.due.length > 0 || deliverables.start.length > 0;

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedCalendarDay(isSelected ? null : dateKey)}
                    style={{
                      minHeight: '92px',
                      borderRadius: '12px',
                      background: isSelected ? '#F0FDFA' : isToday ? '#FAF5FF' : hasDeliverables ? '#FFFFFF' : '#F8FAFC',
                      border: isSelected ? '2px solid #27BEA5' : isToday ? '2px solid #A855F7' : hasDeliverables ? '1px solid #CBD5E1' : '1px solid #F1F5F9',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(39, 190, 165, 0.15)' : 'none'
                    }}
                  >
                    {/* Top row in cell: day number + badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: isToday || isSelected ? 800 : 700,
                        color: isToday ? '#7E22CE' : isSelected ? '#0F766E' : '#0F172A'
                      }}>
                        {day}
                      </span>
                      {isToday && (
                        <span style={{ fontSize: '0.58rem', fontWeight: 800, background: '#A855F7', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          Hoy
                        </span>
                      )}
                    </div>

                    {/* Daily Deliverables inside cell */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' }}>
                      {/* Steps Due on this day */}
                      {deliverables.due.map(step => (
                        <div
                          key={`due_${step.id}`}
                          style={{
                            background: step.statusBg,
                            border: `1px solid ${step.statusBorder}`,
                            borderRadius: '6px',
                            padding: '3px 5px',
                            fontSize: '0.67rem',
                            fontWeight: 700,
                            color: step.statusColor,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={`Cumplir hoy: Paso ${step.stepIndex} - ${step.title} (${step.statusLabel})`}
                        >
                          {step.status === 'completed' ? <CheckCircle2 size={10} style={{ flexShrink: 0 }} /> : step.status === 'overdue' ? <AlertTriangle size={10} style={{ flexShrink: 0 }} /> : <Target size={10} style={{ flexShrink: 0 }} />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            P{step.stepIndex}: {step.title}
                          </span>
                        </div>
                      ))}

                      {/* Steps Starting on this day (if not already due on same day) */}
                      {deliverables.start
                        .filter(s => {
                          const dueStr = `${s.dueDateObj.getFullYear()}-${String(s.dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(s.dueDateObj.getDate()).padStart(2, '0')}`;
                          return dueStr !== dateKey;
                        })
                        .map(step => (
                          <div
                            key={`start_${step.id}`}
                            style={{
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              borderRadius: '6px',
                              padding: '2px 5px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: '#1E40AF',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={`Inicia hoy: Paso ${step.stepIndex} - ${step.title}`}
                          >
                            <Flag size={9} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Inicia: P{step.stepIndex}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Day Expanded Detail Panel */}
            {selectedCalendarDay && (
              <div style={{
                marginTop: '1.25rem',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '1.25rem',
                animation: 'fadeIn 0.2s ease-in-out'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="#27BEA5" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>
                      Detalle de Entregables para el {new Date(`${selectedCalendarDay}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedCalendarDay(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {(!selectedDayData || (selectedDayData.due.length === 0 && selectedDayData.start.length === 0)) ? (
                  <div style={{ fontSize: '0.82rem', color: '#94A3B8', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    No hay entregables ni inicios programados para esta fecha en este proceso.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDayData.due.map(step => (
                      <div
                        key={`sel_due_${step.id}`}
                        style={{
                          background: '#FFFFFF',
                          border: `1px solid ${step.statusBorder}`,
                          borderRadius: '12px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: step.statusBg, color: step.statusColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {step.status === 'completed' ? <CheckCircle2 size={16} /> : <Target size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                              Paso {step.stepIndex}: {step.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <span>Día que debe acabarse: <strong>{step.dueDateObj.toLocaleDateString('es-ES')}</strong></span>
                              <span>• Inició: <strong>{step.startDateObj.toLocaleDateString('es-ES')}</strong></span>
                              {step.assignedMember && <span>• Responsable: <strong>{step.assignedMember.name}</strong></span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '99px',
                            background: step.statusBg,
                            color: step.statusColor,
                            border: `1px solid ${step.statusBorder}`
                          }}>
                            {step.statusLabel}
                          </span>
                          <button
                            onClick={() => setActiveModalTab('tareas')}
                            style={{
                              background: '#27BEA5',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Ver en Checklist
                          </button>
                        </div>
                      </div>
                    ))}

                    {selectedDayData.start
                      .filter(s => {
                        const dueStr = `${s.dueDateObj.getFullYear()}-${String(s.dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(s.dueDateObj.getDate()).padStart(2, '0')}`;
                        return dueStr !== selectedCalendarDay;
                      })
                      .map(step => (
                        <div
                          key={`sel_start_${step.id}`}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#EFF6FF', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Flag size={15} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                                Inicio del Paso {step.stepIndex}: {step.title}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                                Inicia hoy y debe acabarse el <strong>{step.dueDateObj.toLocaleDateString('es-ES')}</strong> (Duración: {step.durationDays} días)
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setActiveModalTab('tareas')}
                            style={{
                              background: '#EFF6FF',
                              color: '#1E40AF',
                              border: '1px solid #BFDBFE',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Ir al Paso
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2: CRONOGRAMA & GANTT SIMPLIFICADO DEL PROCESO
        ═══════════════════════════════════════════════════════════════ */}
        {(calendarSubTab === 'both' || calendarSubTab === 'gantt') && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={20} color="#27BEA5" />
                  <span>Cronograma & Gantt Simplificado del Proceso</span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Visualización secuencial paso a paso con fechas de inicio, fechas de entrega y duración estimada.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} /> Completado
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27BEA5' }} /> En curso
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} /> Atrasado
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }} /> Programado
                </span>
              </div>
            </div>

            {/* Steps Gantt Timeline List */}
            {scheduledSteps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontStyle: 'italic' }}>
                Este proceso no contiene pasos registrados.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {scheduledSteps.map(step => {
                  const startFormatted = step.startDateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                  const dueFormatted = step.dueDateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

                  // Calculate proportional offset & width for Gantt bar
                  const stepStartTime = step.startDateObj.getTime();
                  const stepEndTime = step.dueDateObj.getTime();
                  const leftPct = Math.max(0, Math.min(95, ((stepStartTime - minProjectTime) / totalProjectSpanMs) * 100));
                  const widthPct = Math.max(6, Math.min(100 - leftPct, ((stepEndTime - stepStartTime) / totalProjectSpanMs) * 100));

                  const chkCompleted = (step.checklist || []).filter(c => c.isCompleted).length;
                  const chkTotal = (step.checklist || []).length;

                  return (
                    <div
                      key={step.id}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '1.1rem 1.25rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Step Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{
                            background: '#0F172A',
                            color: '#FFFFFF',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            letterSpacing: '0.04em'
                          }}>
                            Paso {step.stepIndex}
                          </span>
                          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {step.title}
                          </span>
                          {chkTotal > 0 && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              padding: '2px 7px',
                              borderRadius: '99px',
                              color: '#475569',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <CheckSquare size={11} color="#27BEA5" /> {chkCompleted}/{chkTotal}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {step.assignedMember && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
                              <User size={11} color="#27BEA5" />
                              <span>{step.assignedMember.name}</span>
                            </div>
                          )}
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '99px',
                            background: step.statusBg,
                            color: step.statusColor,
                            border: `1px solid ${step.statusBorder}`
                          }}>
                            {step.statusLabel}
                          </span>
                        </div>
                      </div>

                      {/* Explicit Date Details: Inicia, Debe acabar, Duración */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        fontSize: '0.78rem',
                        color: '#475569',
                        flexWrap: 'wrap',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Flag size={13} color="#3B82F6" />
                          <span>Día que inicia: <strong style={{ color: '#0F172A' }}>{startFormatted}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Target size={13} color={step.isOverdue ? '#EF4444' : '#10B981'} />
                          <span>Día que debe acabar: <strong style={{ color: step.isOverdue ? '#EF4444' : '#0F172A' }}>{dueFormatted}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Timer size={13} color="#F59E0B" />
                          <span>Duración: <strong style={{ color: '#0F172A' }}>{step.durationDays} {step.durationDays === 1 ? 'día' : 'días'}</strong></span>
                        </div>
                      </div>

                      {/* Visual Gantt Bar Track */}
                      <div style={{ position: 'relative', width: '100%', height: '26px', background: '#E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                        {/* Progress Bar */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            top: '3px',
                            bottom: '3px',
                            borderRadius: '6px',
                            background: step.status === 'completed'
                              ? 'linear-gradient(90deg, #10B981, #059669)'
                              : step.status === 'overdue'
                              ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                              : step.status === 'in_progress'
                              ? 'linear-gradient(90deg, #27BEA5, #0D9488)'
                              : 'linear-gradient(90deg, #94A3B8, #64748B)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0 6px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis'
                          }}
                          title={`Paso ${step.stepIndex}: Del ${startFormatted} al ${dueFormatted} (${step.durationDays} días)`}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {step.durationDays}d
                          </span>
                        </div>

                        {/* Today Marker Line inside track */}
                        {isTodayWithinProject && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${todayOffsetPercent}%`,
                              top: 0,
                              bottom: 0,
                              width: '2px',
                              background: '#A855F7',
                              zIndex: 3
                            }}
                            title="Línea de fecha actual (Hoy)"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
              {/* Blocking Gate Alert Banner */}
              {blockingItems.length > 0 && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '16px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={22} color="#DC2626" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '0.88rem' }}>
                        Punto de Bloqueo Activo
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#B91C1C', marginTop: '2px' }}>
                        El avance de esta ejecución está bloqueado hasta que se complete en el checklist del cliente: {blockingItems.map((b, i) => (
                          <span key={b.id}>
                            {i > 0 ? ', ' : ''}<strong>"{b.name}"</strong>
                          </span>
                        ))}.
                      </div>
                    </div>
                  </div>
                  {onOpenClientChecklist && (
                    <button
                      type="button"
                      onClick={() => {
                        const instNameLower = (activeInstance?.instanceName || '').toLowerCase();
                        const targetClient = clients.find(c => {
                          if (activeInstance?.clientId && String(c.id) === String(activeInstance.clientId)) return true;
                          if (!c.name) return false;
                          const cNameLower = c.name.toLowerCase();
                          return instNameLower.includes(cNameLower) || cNameLower.includes(instNameLower);
                        });
                        if (targetClient) onOpenClientChecklist(targetClient);
                      }}
                      style={{
                        background: '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      Abrir Checklist
                    </button>
                  )}
                </div>
              )}

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
                        {step.checklist?.length > 0 && (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '99px',
                            background: '#E6FFFA',
                            color: '#0D9488',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckSquare size={11} /> {step.checklist.filter(c => c.isCompleted).length}/{step.checklist.length}
                          </span>
                        )}
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

                          {/* Step Checklist Section */}
                          {step.checklist && step.checklist.length > 0 && (
                            <div style={{ marginTop: '0.85rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '0.85rem' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <ListChecks size={15} color="#27BEA5" /> Verificaciones del Paso
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                                  {step.checklist.filter(c => c.isCompleted).length} de {step.checklist.length} completadas
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {step.checklist.map((chk, cIdx) => {
                                  const chkId = chk.id || cIdx;
                                  const chkText = typeof chk === 'string' ? chk : chk.text;
                                  const isDone = !!(typeof chk === 'object' && chk.isCompleted);
                                  const allowAtt = !!(typeof chk === 'object' && (chk.allowAttachment || chk.requireAttachment || chk.uploadedFileName || chk.uploadedFileUrl));
                                  const reqAtt = !!(typeof chk === 'object' && chk.requireAttachment);
                                  const storeKey = `${step.id}_${chkId}`;
                                  const fileData = fileStore?.[storeKey];
                                  const fileName = (typeof chk === 'object' && chk.uploadedFileName) || fileData?.name || null;
                                  const fileUrl = (typeof chk === 'object' && chk.uploadedFileUrl) || fileData?.url || null;
                                  const hasFile = !!(fileName || fileUrl);

                                  return (
                                    <div
                                      key={chkId}
                                      onClick={e => e.stopPropagation()}
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        background: isDone ? '#F8FAFC' : '#FFFFFF',
                                        border: reqAtt && !hasFile ? '1px solid #FDE68A' : '1px solid #F1F5F9'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                        <label
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            fontSize: '0.82rem',
                                            color: isDone ? '#94A3B8' : '#1E293B',
                                            textDecoration: isDone ? 'line-through' : 'none',
                                            flex: 1
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isDone}
                                            onChange={() => handleToggleStepChecklist && handleToggleStepChecklist(activeInstance.id, step.id, chkId)}
                                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#27BEA5' }}
                                          />
                                          <span>{chkText}</span>
                                        </label>
                                        {allowAtt && (
                                          <span style={{
                                            fontSize: '0.66rem',
                                            fontWeight: 700,
                                            padding: '2px 7px',
                                            borderRadius: '99px',
                                            background: reqAtt ? (hasFile ? '#DCFCE7' : '#FEF3C7') : '#EFF6FF',
                                            color: reqAtt ? (hasFile ? '#15803D' : '#B45309') : '#2563EB',
                                            border: `1px solid ${reqAtt ? (hasFile ? '#86EFAC' : '#FDE68A') : '#BFDBFE'}`
                                          }}>
                                            {reqAtt ? (hasFile ? '✓ Adjunto listo' : '🔒 Adjunto obligatorio') : '📎 Adjunto opcional'}
                                          </span>
                                        )}
                                      </div>

                                      {allowAtt && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingLeft: '23px' }}>
                                          {hasFile && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '7px', padding: '3px 8px', fontSize: '0.73rem', fontWeight: 700, color: '#0F766E' }}>
                                              <Paperclip size={11} />
                                              <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
                                              {fileUrl && (
                                                <button
                                                  type="button"
                                                  onClick={() => setPreviewFile({ name: fileName, url: fileUrl, type: getFileType(fileName, fileData?.type) })}
                                                  style={{ background: '#27BEA5', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 5px', fontSize: '0.66rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                                >
                                                  <Eye size={10} /> Ver
                                                </button>
                                              )}
                                              {fileUrl && /^https?:\/\//i.test(fileUrl) && (
                                                <a
                                                  href={fileUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  style={{ color: '#0284C7', display: 'inline-flex', alignItems: 'center' }}
                                                  title="Abrir enlace externo"
                                                >
                                                  <ExternalLink size={11} />
                                                </a>
                                              )}
                                            </div>
                                          )}

                                          <label style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            background: hasFile ? '#F8FAFC' : '#27BEA5',
                                            color: hasFile ? '#475569' : '#FFFFFF',
                                            border: hasFile ? '1px solid #CBD5E1' : 'none',
                                            padding: '4px 9px',
                                            borderRadius: '7px',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                          }}>
                                            <Upload size={11} /> {hasFile ? 'Cambiar archivo' : 'Subir archivo'}
                                            <input
                                              type="file"
                                              style={{ display: 'none' }}
                                              accept={getAcceptString(step.acceptedFormats)}
                                              onChange={async e => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                await handleUploadStepChecklistWithDrive(step, chkId, file, chkText);
                                              }}
                                            />
                                          </label>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
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
                      accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp,image/*"
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
                ((previewFile.type && previewFile.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif|svg)$/i.test(previewFile.name || '')) ? (
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
