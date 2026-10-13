import React, { useState, useEffect } from 'react';
import { X, Check, Clock, AlertCircle, Upload, FileCheck, ChevronLeft, ChevronRight, Eye, Mail, Lightbulb, FileText, AlertTriangle, Settings, MessageSquare, Paperclip, ChevronDown, ChevronUp, ExternalLink, HelpCircle, ArrowRight, Layers, ShieldAlert, ListChecks, FolderOpen } from 'lucide-react';
import { getBlockingChecklistItemsForInstance } from '../../utils/clientSemaforo';
import GoogleDrivePickerModal from './GoogleDrivePickerModal';

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

export const ActiveExecutionModal = ({
  isOpen,
  onClose,
  activeInstance,
  teamMembers,
  checkOverdueSteps,
  handleStepComplete,
  handleAssignStepMember,
  handleUpdateStepComments,
  handleRequestHelp,
  currentUser,
  fileStore = {},
  setFileStore,
  addToast,
  clients = [],
  onOpenClientChecklist,
  handleToggleStepChecklist
}) => {
  const blockingItems = getBlockingChecklistItemsForInstance(activeInstance, clients);
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [commentingStepId, setCommentingStepId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [mentionSearch, setMentionSearch] = useState(null);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [showMotivationStepId, setShowMotivationStepId] = useState(null);
  const [showAttachmentsDropdown, setShowAttachmentsDropdown] = useState(false);

  // Google Drive states for Execution & Steps
  const [localDriveFolderUrl, setLocalDriveFolderUrl] = useState(null);
  const [isEnsuringDriveFolder, setIsEnsuringDriveFolder] = useState(false);
  const [showSubfolderDrawer, setShowSubfolderDrawer] = useState(false);
  const [subfolderLinkInput, setSubfolderLinkInput] = useState('');
  const [subfolderCreatePath, setSubfolderCreatePath] = useState('');
  const [saveSubfolderForClient, setSaveSubfolderForClient] = useState(true);
  const [availableSubfolders, setAvailableSubfolders] = useState([]);
  const [isSavingSubfolder, setIsSavingSubfolder] = useState(false);
  const [driveLinkingStepId, setDriveLinkingStepId] = useState(null);
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [driveFilesForStep, setDriveFilesForStep] = useState([]);
  const [isLoadingDriveFilesForStep, setIsLoadingDriveFilesForStep] = useState(false);
  // Fullscreen Google Picker Modal state
  const [drivePickerState, setDrivePickerState] = useState({
    isOpen: false,
    mode: 'step_file', // 'step_file' | 'subfolder'
    step: null,
    checklistItemId: null,
    title: 'Seleccionar archivo de Google Drive'
  });
  const [collapsedChecklists, setCollapsedChecklists] = useState({});

  const onCompleteStepLocal = (stepId, isCompleted, uploadedName = null, uploadedUrl = null) => {
    handleStepComplete(activeInstance.id, stepId, isCompleted, uploadedName, uploadedUrl);
    const targetStep = activeInstance.steps.find(s => s.id === stepId);
    if (isCompleted && targetStep?.motivation) {
      setShowMotivationStepId(stepId);
      setTimeout(() => {
        setShowMotivationStepId(null);
      }, 8000);
    }
  };

  const handleToggleSubfolderDrawer = async () => {
    const next = !showSubfolderDrawer;
    setShowSubfolderDrawer(next);
    if (next) {
      setSubfolderLinkInput(localDriveFolderUrl || activeInstance?.driveFolderUrl || '');
      try {
        const res = await fetch('/api/integrations/google-drive/files?type=folders');
        if (res.ok) {
          const data = await res.json();
          setAvailableSubfolders(data.files || []);
        }
      } catch (_) {}
    }
  };

  const handleSaveExecutionSubfolder = async (overrideFolderUrl = null) => {
    setIsSavingSubfolder(true);
    try {
      const res = await fetch('/api/integrations/google-drive/set-instance-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: activeInstance.id,
          folderInput: overrideFolderUrl || subfolderLinkInput,
          createSubfolderPath: overrideFolderUrl ? '' : subfolderCreatePath,
          saveForClient: saveSubfolderForClient
        })
      });
      const data = await res.json();
      if (res.ok && data.driveFolderUrl) {
        setLocalDriveFolderUrl(data.driveFolderUrl);
        setShowSubfolderDrawer(false);
        setSubfolderCreatePath('');
        if (addToast) addToast('📂 Subcarpeta de Google Drive vinculada a esta ejecución', 'success');
      } else {
        if (addToast) addToast(data.error || 'No se pudo vincular la subcarpeta.', 'error');
      }
    } catch (err) {
      if (addToast) addToast('Error al guardar la subcarpeta de Google Drive.', 'error');
    } finally {
      setIsSavingSubfolder(false);
    }
  };

  const handleOpenExecutionDriveFolder = async () => {
    const existingUrl = localDriveFolderUrl || activeInstance?.driveFolderUrl;
    if (existingUrl) {
      window.open(existingUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setIsEnsuringDriveFolder(true);
    try {
      const res = await fetch('/api/integrations/google-drive/ensure-instance-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: activeInstance.id })
      });
      const data = await res.json();
      if (res.ok && (data.driveFolderUrl || data.folderUrl)) {
        const url = data.driveFolderUrl || data.folderUrl;
        setLocalDriveFolderUrl(url);
        window.open(url, '_blank', 'noopener,noreferrer');
        if (addToast) addToast('Carpeta de Google Drive vinculada y abierta', 'success');
      } else {
        if (addToast) addToast(data.error || 'Configura Google Drive en Integraciones > Externas para vincular carpetas.', 'info');
      }
    } catch (err) {
      if (addToast) addToast('No se pudo abrir la carpeta de Google Drive.', 'error');
    } finally {
      setIsEnsuringDriveFolder(false);
    }
  };

  const handleUploadStepFileWithDrive = async (step, file, checklistItemId = null) => {
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);
    const storeKey = checklistItemId !== null && checklistItemId !== undefined ? `${step.id}_${checklistItemId}` : step.id;
    setFileStore(prev => ({
      ...prev,
      [storeKey]: { url: fileUrl, name: file.name, type: file.type }
    }));

    if (checklistItemId !== null && checklistItemId !== undefined) {
      if (handleToggleStepChecklist) {
        await handleToggleStepChecklist(activeInstance.id, step.id, checklistItemId, {
          isCompleted: true,
          uploadedFileName: file.name,
          uploadedFileUrl: fileUrl,
          fileType: file.type
        });
      }
    } else {
      onCompleteStepLocal(step.id, true, file.name, fileUrl);
    }

    // Attempt background upload to Google Drive if connected
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result || '').toString().split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (base64Data) {
        const res = await fetch('/api/integrations/google-drive/upload-step-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instanceId: activeInstance.id,
            stepId: step.id,
            checklistItemId: checklistItemId !== null && checklistItemId !== undefined ? checklistItemId : undefined,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64Data
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.webViewLink) {
            setFileStore(prev => ({
              ...prev,
              [storeKey]: { url: data.webViewLink, name: file.name, type: file.type }
            }));
            if (checklistItemId !== null && checklistItemId !== undefined) {
              if (handleToggleStepChecklist) {
                await handleToggleStepChecklist(activeInstance.id, step.id, checklistItemId, {
                  isCompleted: true,
                  uploadedFileName: file.name,
                  uploadedFileUrl: data.webViewLink,
                  fileType: file.type
                });
              }
            } else {
              onCompleteStepLocal(step.id, true, file.name, data.webViewLink);
            }
            if (addToast) addToast(`☁️ Archivo "${file.name}" subido y sincronizado en Google Drive`, 'success');
          } else if (data.uploadedToDrive === false) {
            console.warn('Drive upload status:', data.reason);
            if (addToast && data.reason) {
              addToast(`ℹ️ Archivo adjuntado localmente. (${data.reason})`, 'info');
            }
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('Drive upload error:', errData.error);
          if (addToast) {
            addToast(`⚠️ Archivo guardado localmente, pero no se pudo subir a Drive: ${errData.error || 'Verifica la conexión con Google Drive'}`, 'warning');
          }
        }
      }
    } catch (driveErr) {
      console.warn('Optional Drive step upload skipped:', driveErr);
    }
  };

  const handleToggleStepDriveLinker = async (linkerKey) => {
    if (driveLinkingStepId === linkerKey) {
      setDriveLinkingStepId(null);
      return;
    }
    setDriveLinkingStepId(linkerKey);
    setDriveLinkInput('');
    setIsLoadingDriveFilesForStep(true);
    try {
      const folderParam = activeInstance?.driveFolderId ? `?folderId=${encodeURIComponent(activeInstance.driveFolderId)}` : '';
      const res = await fetch(`/api/integrations/google-drive/files${folderParam}`);
      if (res.ok) {
        const data = await res.json();
        setDriveFilesForStep(data.files || []);
      }
    } catch (err) {
      console.warn('Error loading Drive files for step:', err);
    } finally {
      setIsLoadingDriveFilesForStep(false);
    }
  };

  const handleLinkDriveFileToStep = (step, fileUrl, fileName, checklistItemId = null) => {
    const cleanUrl = (fileUrl || driveLinkInput || '').trim();
    if (!cleanUrl) return;
    const displayTitle = fileName || (cleanUrl.includes('docs.google.com/document') ? 'Google Doc (Drive)' : cleanUrl.includes('docs.google.com/spreadsheets') ? 'Google Sheet (Drive)' : 'Archivo de Google Drive');
    const storeKey = checklistItemId !== null && checklistItemId !== undefined ? `${step.id}_${checklistItemId}` : step.id;
    setFileStore(prev => ({
      ...prev,
      [storeKey]: { url: cleanUrl, name: displayTitle, type: 'drive_link' }
    }));
    if (checklistItemId !== null && checklistItemId !== undefined) {
      if (handleToggleStepChecklist) {
        handleToggleStepChecklist(activeInstance.id, step.id, checklistItemId, {
          isCompleted: true,
          uploadedFileName: displayTitle,
          uploadedFileUrl: cleanUrl,
          fileType: 'drive_link'
        });
      }
    } else {
      onCompleteStepLocal(step.id, true, displayTitle, cleanUrl);
    }
    setDriveLinkingStepId(null);
    setDriveLinkInput('');
    if (addToast) addToast(`🔗 "${displayTitle}" vinculado desde Google Drive`, 'success');
  };

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

  // Aggregate all attached files (instance level + step level + fileStore)
  const allAttachments = [];
  (activeInstance.attachments || []).forEach(att => {
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

  (activeInstance.steps || []).forEach(step => {
    const fileFromStore = fileStore?.[step.id];
    if (step.uploadedFileName || step.uploadedFileUrl || fileFromStore) {
      allAttachments.push({
        id: `step_${step.id}`,
        name: step.uploadedFileName || fileFromStore?.name || 'Documento adjunto',
        url: step.uploadedFileUrl || fileFromStore?.url || null,
        type: getFileType(step.uploadedFileName || fileFromStore?.name, fileFromStore?.type),
        stepTitle: step.title,
        source: `Paso: ${step.title}`
      });
    }
    (step.checklist || []).forEach((chk, cIdx) => {
      const chkId = chk.id || cIdx;
      const chkStore = fileStore?.[`${step.id}_${chkId}`];
      if (chk?.uploadedFileName || chk?.uploadedFileUrl || chkStore) {
        const fName = chk.uploadedFileName || chkStore?.name || 'Adjunto de checklist';
        const fUrl = chk.uploadedFileUrl || chkStore?.url || null;
        allAttachments.push({
          id: `chk_${step.id}_${chkId}`,
          name: fName,
          url: fUrl,
          type: getFileType(fName, chk.fileType || chkStore?.type),
          stepTitle: step.title,
          source: `Checklist (${step.title}): ${chk.text || 'Ítem'}`
        });
      }
    });
  });

  const uniqueAttachments = [];
  const seenKeys = new Set();
  allAttachments.forEach(att => {
    const key = att.url || att.name;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueAttachments.push(att);
    }
  });

  const renderChecklistItemRow = (step, chk, cIdx) => {
    const chkId = chk.id || cIdx;
    const storeKey = `${step.id}_${chkId}`;
    const storedFile = fileStore?.[storeKey];
    const attachedName = chk.uploadedFileName || storedFile?.name || null;
    const attachedUrl = chk.uploadedFileUrl || storedFile?.url || null;
    const hasFile = !!(attachedName || attachedUrl);
    const isReq = !!chk.requireAttachment;
    const allowsAtt = !!(chk.allowAttachment || chk.requireAttachment || hasFile);

    return (
      <div
        key={chkId}
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '7px 10px',
          borderRadius: '8px',
          background: chk.isCompleted ? '#F8FAFC' : (isReq && !hasFile ? '#FFFBEB' : '#FFFFFF'),
          border: isReq && !hasFile ? '1px solid #FDE68A' : '1px solid #E2E8F0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              flex: 1,
              minWidth: '170px',
              margin: 0,
              fontSize: '0.82rem',
              color: chk.isCompleted ? '#94A3B8' : '#1E293B',
              textDecoration: chk.isCompleted ? 'line-through' : 'none',
              fontWeight: isReq && !chk.isCompleted ? 600 : 500
            }}
          >
            <input
              type="checkbox"
              checked={!!chk.isCompleted}
              onChange={() => handleToggleStepChecklist && handleToggleStepChecklist(activeInstance.id, step.id, chkId)}
              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#0D9488' }}
            />
            <span>{chk.text || chk}</span>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            {isReq && (
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '999px',
                background: hasFile ? '#DCFCE7' : '#FEF3C7',
                color: hasFile ? '#166534' : '#B45309',
                border: hasFile ? '1px solid #BBF7D0' : '1px solid #FDE68A'
              }}>
                {hasFile ? '✓ Adjunto obligatorio listo' : '🔒 Adjunto obligatorio'}
              </span>
            )}
            {!isReq && chk.allowAttachment && !hasFile && (
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '999px',
                background: '#F0FDFA',
                color: '#0F766E',
                border: '1px solid #CCFBF1'
              }}>
                📎 Adjunto opcional
              </span>
            )}

            {/* File Upload / Link actions directly on the checklist item */}
            {(allowsAtt || !chk.isCompleted) && (
              <>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: hasFile ? '#F1F5F9' : '#0D9488',
                    color: hasFile ? '#334155' : '#FFFFFF',
                    border: hasFile ? '1px solid #CBD5E1' : 'none',
                    margin: 0
                  }}
                  title="Subir archivo desde tu equipo (se sincroniza con Google Drive)"
                >
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept={getAcceptString(step.acceptedFormats)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadStepFileWithDrive(step, file, chkId);
                      }
                    }}
                  />
                  <Upload size={11} />
                  <span>{hasFile ? 'Cambiar' : 'Subir archivo'}</span>
                </label>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrivePickerState({
                      isOpen: true,
                      mode: 'step_file',
                      step,
                      checklistItemId: chkId,
                      title: `Google Drive — ${chk.label || step.title}`
                    });
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    border: '1px solid #BFDBFE'
                  }}
                  title="Abrir navegador visual de Google Drive para seleccionar archivo"
                >
                  <FolderOpen size={11} /> Drive
                </button>
              </>
            )}
          </div>
        </div>

        {/* Attached File Pill with Preview & External Link */}
        {hasFile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '6px',
            padding: '4px 8px',
            marginLeft: '22px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <FileCheck size={13} color="#16A34A" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '210px' }}>
                {attachedName}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {attachedUrl && attachedUrl.startsWith('http') && (
                <a
                  href={attachedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="close-btn-aesthetic"
                  style={{ width: '22px', height: '22px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                  title="Abrir en Google Drive / Pestaña nueva"
                >
                  <ExternalLink size={11} />
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setPreviewFile(storedFile || {
                    name: attachedName || 'Documento.pdf',
                    url: attachedUrl,
                    type: getFileType(attachedName, chk.fileType),
                    mock: !attachedUrl
                  });
                }}
                className="close-btn-aesthetic"
                style={{ width: '22px', height: '22px', padding: 0 }}
                title="Previsualizar archivo"
              >
                <Eye size={11} />
              </button>
            </div>
          </div>
        )}

        {/* Inline Google Drive Linker for this Checklist Item */}
        {driveLinkingStepId === storeKey && (
          <div style={{ marginLeft: '22px', background: '#FFFFFF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '7px', fontSize: '0.73rem' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: driveFilesForStep.length > 0 ? '6px' : '0' }}>
              <input
                type="text"
                placeholder="Pega link de Google Drive / Docs..."
                value={driveLinkInput}
                onChange={(e) => setDriveLinkInput(e.target.value)}
                style={{ flex: 1, padding: '4px 7px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.72rem' }}
              />
              <button
                type="button"
                onClick={() => handleLinkDriveFileToStep(step, driveLinkInput, null, chkId)}
                style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.72rem' }}
              >
                Vincular
              </button>
            </div>
            {isLoadingDriveFilesForStep ? (
              <div style={{ color: '#64748B', fontSize: '0.68rem' }}>Cargando archivos de Google Drive...</div>
            ) : driveFilesForStep.length > 0 ? (
              <div style={{ maxHeight: '95px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {driveFilesForStep.slice(0, 10).map(df => (
                  <div
                    key={df.id}
                    onClick={() => handleLinkDriveFileToStep(step, df.webViewLink || `https://drive.google.com/file/d/${df.id}/view`, df.name, chkId)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', borderRadius: '5px', background: '#F8FAFC', cursor: 'pointer', border: '1px solid #E2E8F0' }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px', fontWeight: 600 }}>
                      {df.isFolder ? '📁' : '📄'} {df.name}
                    </span>
                    <span style={{ color: '#2563EB', fontWeight: 700, fontSize: '0.68rem' }}>Elegir</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '1200px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: 'var(--radius-lg)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Fixed Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.15rem 2rem', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem' }}>Detalles de la Ejecución</span>
             <button
               type="button"
               onClick={handleOpenExecutionDriveFolder}
               disabled={isEnsuringDriveFolder}
               style={{
                 border: '1px solid #BFDBFE',
                 background: (activeInstance?.driveFolderUrl || localDriveFolderUrl) ? '#EFF6FF' : '#F8FAFC',
                 color: '#2563EB',
                 padding: '4px 10px',
                 borderRadius: '20px',
                 fontSize: '0.75rem',
                 fontWeight: 700,
                 cursor: 'pointer',
                 display: 'inline-flex',
                 alignItems: 'center',
                 gap: '5px',
                 transition: 'all 0.15s ease'
               }}
               title="Abrir o crear carpeta de esta ejecución en Google Drive"
             >
               <FolderOpen size={13} color="#2563EB" />
               <span>{isEnsuringDriveFolder ? 'Abriendo Drive...' : (activeInstance?.driveFolderUrl || localDriveFolderUrl) ? 'Carpeta Drive' : 'Vincular Carpeta Drive'}</span>
               <ExternalLink size={11} />
             </button>
             <button
               type="button"
               onClick={handleToggleSubfolderDrawer}
               style={{
                 border: '1px solid #A7F3D0',
                 background: showSubfolderDrawer ? '#D1FAE5' : '#ECFDF5',
                 color: '#065F46',
                 padding: '4px 10px',
                 borderRadius: '20px',
                 fontSize: '0.75rem',
                 fontWeight: 700,
                 cursor: 'pointer',
                 display: 'inline-flex',
                 alignItems: 'center',
                 gap: '4px',
                 transition: 'all 0.15s ease'
               }}
               title="Elegir o pegar una subcarpeta específica de Google Drive para este Cliente / Ejecución"
             >
               <span>📂 Subcarpeta</span>
               <ChevronDown size={12} style={{ transform: showSubfolderDrawer ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
             </button>
             {uniqueAttachments.length > 0 && (
               <button
                 onClick={() => setShowAttachmentsDropdown(!showAttachmentsDropdown)}
                 style={{
                   border: '1px solid #E2E8F0',
                   background: showAttachmentsDropdown ? '#E6FFFA' : '#F8FAFC',
                   color: showAttachmentsDropdown ? '#0D9488' : '#475569',
                   padding: '4px 10px',
                   borderRadius: '20px',
                   fontSize: '0.75rem',
                   fontWeight: 700,
                   cursor: 'pointer',
                   display: 'inline-flex',
                   alignItems: 'center',
                   gap: '5px',
                   transition: 'all 0.15s ease'
                 }}
                 title="Ver archivos adjuntos"
               >
                 <Paperclip size={13} color={showAttachmentsDropdown ? '#0D9488' : '#64748B'} />
                 <span>Adjuntos ({uniqueAttachments.length})</span>
                 <ChevronDown size={13} style={{ transform: showAttachmentsDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
               </button>
             )}
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <button
               onClick={() => setIsFocusMode(!isFocusMode)}
               style={{ border: 'none', background: isFocusMode ? '#e8f7f5' : '#f5f3f0', color: isFocusMode ? 'var(--color-primary-hover)' : 'var(--text-muted)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
             >
               {isFocusMode ? <><Eye size={13} /> Modo Enfoque</> : <><Layers size={13} /> Modo Completo</>}
             </button>
             <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
           </div>
        </div>

        {/* Collapsible Subfolder Selector / Linker Drawer */}
        {showSubfolderDrawer && (
          <div style={{
            background: '#F0FDF4',
            borderBottom: '1px solid #BBF7D0',
            padding: '0.85rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#065F46' }}>
                📂 Subcarpeta Específica en Google Drive para "{activeInstance.instanceName}"
              </span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 600, color: '#065F46', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saveSubfolderForClient}
                  onChange={(e) => setSaveSubfolderForClient(e.target.checked)}
                />
                <span>Usar también esta subcarpeta para futuras ejecuciones de este Cliente</span>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Pega el link o ID de la subcarpeta en Drive..."
                  value={subfolderLinkInput}
                  onChange={(e) => setSubfolderLinkInput(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #86EFAC', fontSize: '0.78rem', background: '#fff' }}
                />
                <button
                  type="button"
                  disabled={isSavingSubfolder}
                  onClick={() => handleSaveExecutionSubfolder()}
                  style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {isSavingSubfolder ? 'Guardando...' : 'Vincular Link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrivePickerState({
                      isOpen: true,
                      mode: 'subfolder',
                      step: null,
                      checklistItemId: null,
                      title: `Elegir carpeta para "${activeInstance.instanceName}"`
                    });
                  }}
                  style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #93C5FD', borderRadius: '8px', padding: '6px 12px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Abrir navegador visual estilo Google Drive"
                >
                  <FolderOpen size={13} /> Explorar en Drive
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="O crear nueva subcarpeta (ej. Clientes/Acme/2026)..."
                  value={subfolderCreatePath}
                  onChange={(e) => setSubfolderCreatePath(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #BFDBFE', fontSize: '0.78rem', background: '#fff' }}
                />
                <button
                  type="button"
                  disabled={isSavingSubfolder || !subfolderCreatePath.trim()}
                  onClick={() => handleSaveExecutionSubfolder()}
                  style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Crear Ruta
                </button>
              </div>
            </div>

            {availableSubfolders.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857' }}>Subcarpetas existentes en tu Drive:</span>
                {availableSubfolders.slice(0, 12).map(folder => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => handleSaveExecutionSubfolder(folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`)}
                    style={{ background: '#fff', border: '1px solid #6EE7B7', color: '#065F46', borderRadius: '999px', padding: '3px 9px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    📁 {folder.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Top Attachments Drawer */}
        {showAttachmentsDropdown && uniqueAttachments.length > 0 && (
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
        
        {/* Scrollable Content Container */}
        <div style={{ padding: '0.75rem 2rem 2rem 2rem', overflowY: 'auto', flex: 1 }}>
          {blockingItems.length > 0 && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '1.25rem'
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
          <div className="achievement-card-unified">
            {/* Header info */}
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '4px' }}>
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
                    {(() => {
                      const allAssignees = activeInstance.steps
                        .filter(s => s && (s.assignedTo || s.leadId))
                        .flatMap(s => [
                          ...(s.leadId ? [s.leadId] : []),
                          ...(Array.isArray(s.assignedTo) ? s.assignedTo : (s.assignedTo && s.assignedTo !== 'Unassigned' ? [s.assignedTo] : []))
                        ])
                        .map(String);
                      const uniqueAssignees = Array.from(new Set(allAssignees));
                      return (
                        <>
                          {uniqueAssignees.map((assigneeId, i) => {
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
                          {uniqueAssignees.length === 0 && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ninguno asignado aún</span>
                          )}
                        </>
                      );
                    })()}
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

                      {!isCenter && (
                        <h4 className="trio-card-title">{step.title}</h4>
                      )}
                      
                      {isCenter && (
                        <div style={{ display: 'flex', gap: '1.5rem', width: '100%', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '1.25rem', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
                          {/* Col 1: Detalles del Paso */}
                          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '280px' }}>
                            <div>
                              <h4 className="trio-card-title" style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.3' }}>{step.title}</h4>
                              <span className="trio-card-date" style={{ display: 'inline-block', fontSize: '0.85rem', color: 'var(--color-primary-hover)', fontWeight: 600 }}>Límite: {new Date(step.dueDate).toLocaleDateString()}</span>
                            </div>
                              
                              <p className="trio-card-desc" style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{step.description}</p>
                              
                              {isOverdue && (
                                <div className="overdue-banner" style={{ margin: '0.5rem 0 0 0', display: 'flex', alignItems: 'center', gap: '6px', background: '#FFF0F0', color: '#D32F2F', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                  <AlertCircle size={14} />
                                  <span>Límite vencido el {new Date(step.dueDate).toLocaleDateString()}</span>
                                </div>
                              )}

                              {(step.motivation && showMotivationStepId === step.id) && (
                                <div className="step-motivation" style={{ marginTop: 'auto', fontSize: '0.85rem', fontStyle: 'italic', background: 'var(--bg-companion)', padding: '12px', borderRadius: '10px', borderLeft: '3px solid var(--color-primary)', color: 'var(--text-main)', display: 'flex', gap: '8px', alignItems: 'flex-start', boxShadow: '0 4px 12px rgba(39, 190, 167, 0.08)' }}>
                                  <Lightbulb size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-primary)' }}/>
                                  <span>{step.motivation}</span>
                                </div>
                              )}

                              {/* Step Checklist in Focus Mode (Desplegable / Colapsable) */}
                              {step.checklist && step.checklist.length > 0 && (() => {
                                const isCollapsed = !!collapsedChecklists[step.id];
                                const completedCount = step.checklist.filter(c => c.isCompleted).length;
                                const totalCount = step.checklist.length;
                                return (
                                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '0.85rem', marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <ListChecks size={15} color="#27BEA5" /> Checklist y Entregables del Paso
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                                          {completedCount} de {totalCount} completados
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setCollapsedChecklists(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                                          style={{
                                            background: '#F1F5F9',
                                            border: '1px solid #CBD5E1',
                                            borderRadius: '6px',
                                            padding: '2px 8px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: '#334155',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            cursor: 'pointer'
                                          }}
                                          title={isCollapsed ? 'Desplegar checklist' : 'Colapsar checklist'}
                                        >
                                          <span>{isCollapsed ? 'Desplegar' : 'Colapsar'}</span>
                                          {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                                        </button>
                                      </div>
                                    </div>

                                    {isCollapsed ? (
                                      <div 
                                        onClick={() => setCollapsedChecklists(prev => ({ ...prev, [step.id]: false }))}
                                        style={{
                                          background: '#F8FAFC',
                                          border: '1px dashed #CBD5E1',
                                          borderRadius: '8px',
                                          padding: '10px 14px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          gap: '10px'
                                        }}
                                      >
                                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                                          📦 <strong>{totalCount} entregables en este paso</strong> ({completedCount} completados). Clic para desplegar.
                                        </div>
                                        <div style={{ width: '80px', height: '6px', background: '#E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                                          <div 
                                            style={{ 
                                              height: '100%', 
                                              background: '#27BEA5', 
                                              width: `${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%` 
                                            }} 
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {step.checklist.map((chk, cIdx) => renderChecklistItemRow(step, chk, cIdx))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Col 2: Acciones, Colaboradores y Notas (Sticky) */}
                            <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '260px', position: 'sticky', top: '1rem', alignSelf: 'flex-start' }}>
                            
                            {/* Bloque de Acción Principal (Completar Paso) */}
                            <div className="trio-card-action" style={{ background: '#FAF9F6', padding: '12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.04)' }}>
                              <div style={{ width: '100%' }}>
                                {step.driveSubfolder && (
                                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', padding: '3px 8px', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    📂 Subcarpeta Drive: <code>{step.driveSubfolder}</code>
                                  </div>
                                )}
                                {step.isCompleted ? (
                                  <div style={{ color: 'var(--color-primary-hover)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                    <Check size={16} /> Paso Completado
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', fontSize: '0.85rem', padding: '0.55rem', borderRadius: '8px' }}
                                      onClick={() => onCompleteStepLocal(step.id, true)}
                                    >
                                      {(() => {
                                        const nextStep = activeInstance.steps[item.index + 1];
                                        const nextAssignee = nextStep && nextStep.assignedTo ? teamMembers.find(m => String(m.id) === String(nextStep.assignedTo)) : null;
                                        return nextAssignee ? (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                            Pasar a {nextAssignee.name} <ArrowRight size={14} />
                                          </span>
                                        ) : (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                            Completar Paso <Check size={14} />
                                          </span>
                                        );
                                      })()}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      disabled={step.helpRequested}
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '5px', 
                                        width: '100%', 
                                        fontSize: '0.75rem', 
                                        padding: '0.4rem', 
                                        marginTop: '0.5rem', 
                                        background: step.helpRequested ? '#f5f5f5' : 'transparent', 
                                        border: step.helpRequested ? '1px solid #e0e0e0' : '1px dashed #CBD5E1', 
                                        color: step.helpRequested ? '#9e9e9e' : 'var(--color-primary)', 
                                        borderRadius: '8px',
                                        cursor: step.helpRequested ? 'not-allowed' : 'pointer'
                                      }}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const helpMsg = `${currentUser?.name || 'Un compañero'} solicita una mano en el paso "${step.title}" de "${activeInstance.instanceName}".`;
                                        try {
                                          await fetch('/api/notifications', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                                            body: JSON.stringify({
                                              id: `help-${step.id}-${Date.now()}`,
                                              instanceId: activeInstance.id,
                                              stepId: step.id,
                                              instanceName: activeInstance.instanceName,
                                              stepTitle: step.title,
                                              message: helpMsg,
                                              type: 'help'
                                            })
                                          });
                                          window.dispatchEvent(new Event('notifications-updated'));
                                          await handleRequestHelp(activeInstance.id, step.id);
                                          if (addToast) addToast("¡Pedido de ayuda enviado al jefe y departamento! Un compañero vendrá al rescate.", "success");
                                        } catch (err) {
                                          console.error("Error al pedir ayuda:", err);
                                        }
                                      }}
                                    >
                                      {step.helpRequested ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                          <HelpCircle size={13} /> Ayuda Solicitada
                                        </span>
                                      ) : (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                          <AlertCircle size={13} /> Solicitar Apoyo
                                        </span>
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Colaboradores / Encargado y Asignados */}
                            <div style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', padding: '10px' }}>
                              <div style={{ marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.73rem', color: '#0F172A', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                                  👑 Encargado Principal del Paso:
                                </span>
                                <select
                                  value={step.leadId ? String(step.leadId) : ''}
                                  onChange={(e) => {
                                    const newLead = e.target.value;
                                    const currentAssigned = Array.isArray(step.assignedTo)
                                      ? step.assignedTo.map(String)
                                      : (step.assignedTo && step.assignedTo !== 'Unassigned' ? [String(step.assignedTo)] : []);
                                    const updatedList = newLead && !currentAssigned.includes(String(newLead))
                                      ? [String(newLead), ...currentAssigned]
                                      : currentAssigned;
                                    handleAssignStepMember(activeInstance.id, step.id, updatedList, newLead);
                                  }}
                                  style={{ width: '100%', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', fontWeight: 600, color: '#0F172A' }}
                                >
                                  <option value="">-- Sin encargado principal marcado --</option>
                                  {teamMembers.map(m => (
                                    <option key={m.id} value={String(m.id)}>{m.name} ({m.role})</option>
                                  ))}
                                </select>
                              </div>

                              <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                                👥 Asignados al Paso (marca varios y usa 👑 para elegir el Principal):
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '115px', overflowY: 'auto' }}>
                                {teamMembers.map(m => {
                                  const currentAssigned = Array.isArray(step.assignedTo)
                                    ? step.assignedTo.map(String)
                                    : (step.assignedTo && step.assignedTo !== 'Unassigned' ? [String(step.assignedTo)] : []);
                                  const effectiveLead = step.leadId ? String(step.leadId) : '';
                                  const isChecked = currentAssigned.includes(String(m.id)) || effectiveLead === String(m.id);
                                  const isLead = effectiveLead === String(m.id);
                                  return (
                                    <div key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', padding: '2px 5px 2px 7px', border: isLead ? '1px solid #0D9488' : '1px solid rgba(0,0,0,0.08)', borderRadius: '999px', background: isLead ? '#CCFBF1' : (isChecked ? 'rgba(39, 190, 167, 0.1)' : '#f9f9f9'), fontWeight: isChecked ? 600 : 400, userSelect: 'none' }}>
                                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            let updatedList;
                                            let nextLead = effectiveLead;
                                            if (e.target.checked) {
                                              updatedList = Array.from(new Set([...currentAssigned, String(m.id)]));
                                            } else {
                                              updatedList = currentAssigned.filter(id => id !== String(m.id));
                                              if (nextLead === String(m.id)) nextLead = '';
                                            }
                                            handleAssignStepMember(activeInstance.id, step.id, updatedList, nextLead);
                                          }}
                                          style={{ cursor: 'pointer', margin: 0, accentColor: '#0D9488' }}
                                        />
                                        <span>{m.name}</span>
                                      </label>
                                      <button
                                        type="button"
                                        title={isLead ? 'Quitar como Encargado Principal' : 'Marcar como Encargado Principal'}
                                        onClick={() => {
                                          const nextLead = isLead ? '' : String(m.id);
                                          const updatedList = nextLead && !currentAssigned.includes(String(m.id))
                                            ? Array.from(new Set([String(m.id), ...currentAssigned]))
                                            : currentAssigned;
                                          handleAssignStepMember(activeInstance.id, step.id, updatedList, nextLead);
                                        }}
                                        style={{
                                          border: isLead ? '1px solid #0D9488' : '1px solid #CBD5E1',
                                          background: isLead ? '#0D9488' : '#FFFFFF',
                                          color: isLead ? '#FFFFFF' : '#64748B',
                                          borderRadius: '999px',
                                          padding: '1px 5px',
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          lineHeight: 1.2
                                        }}
                                      >
                                        {isLead ? '👑 Principal' : '👑'}
                                      </button>
                                    </div>
                                  );
                                })}
                                {teamMembers.length === 0 && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin colaboradores</span>
                                )}
                              </div>
                            </div>

                            {/* Notas / Comentarios */}
                            {(commentingStepId === step.id || isCenter) && (
                              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '0.75rem', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>Notas de Relevo / Colaboración</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({step.comments?.length || 0})</span>
                                </div>
                                <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                  {(step.comments || []).map(c => (
                                    <div key={c.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.03)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                        <span>{c.userName}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>{new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      </div>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-main)', marginTop: '2px' }}>{c.text}</span>
                                    </div>
                                  ))}
                                  {(step.comments || []).length === 0 && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin notas en este paso. Escribe abajo (usa @).</span>
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
                                  setMentionSearch(null);
                                }} style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                                  
                                  {mentionSearch && mentionSearch.stepId === step.id && (() => {
                                    const matches = teamMembers.filter(m => m.name.toLowerCase().includes(mentionSearch.query.toLowerCase()));
                                    if (matches.length === 0) return null;
                                    return (
                                      <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', zIndex: 50, display: 'flex', flexDirection: 'column', maxHeight: '120px', overflowY: 'auto', boxShadow: 'var(--shadow-card)' }}>
                                        {matches.map(m => (
                                          <div 
                                            key={m.id} 
                                            style={{ padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', textAlign: 'left' }}
                                            onClick={() => {
                                              const words = commentText.split(' ');
                                              words.pop(); // Remove @query
                                              setCommentText([...words, `@${m.name} `].join(' '));
                                              setMentionSearch(null);
                                            }}
                                          >
                                            <strong>{m.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>({m.role})</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}

                                  <input
                                    type="text"
                                    placeholder="Nota... (ej. @Carlos)"
                                    value={commentText}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCommentText(val);
                                      const lastWord = val.split(' ').pop();
                                      if (lastWord.startsWith('@')) {
                                        setMentionSearch({ query: lastWord.substring(1), stepId: step.id });
                                      } else {
                                        setMentionSearch(null);
                                      }
                                    }}
                                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
                                  />
                                  <button type="submit" className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '8px' }}>
                                    Guardar
                                  </button>
                                </form>
                              </div>
                            )}

                          </div>
                        </div>
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
                              {step.checklist?.length > 0 && (
                                <span className="badge" style={{ background: '#E6FFFA', color: '#0D9488', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <ListChecks size={11} /> {step.checklist.filter(c => c.isCompleted).length}/{step.checklist.length}
                                </span>
                              )}
                            </div>
                          </div>
                          <p>{step.description}</p>

                          {/* Step Checklist */}
                          {step.checklist && step.checklist.length > 0 && (
                            <div style={{ marginTop: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.75rem' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <ListChecks size={14} color="#27BEA5" /> Checklist y Entregables ({step.checklist.filter(c => c.isCompleted).length}/{step.checklist.length})
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {step.checklist.map((chk, cIdx) => renderChecklistItemRow(step, chk, cIdx))}
                              </div>
                            </div>
                          )}

                          {/* Steps List Comments Block */}
                          {commentingStepId === step.id && (
                            <div style={{ marginTop: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '0.75rem', textAlign: 'left' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
                                />
                                <button type="submit" className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '8px' }}>
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

                          <div style={{ marginTop: '0.5rem', width: '100%' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Asignados:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.06)', padding: '6px 10px', borderRadius: '8px', background: 'white' }}>
                              {teamMembers.map(m => {
                                const currentAssigned = Array.isArray(step.assignedTo)
                                  ? step.assignedTo.map(String)
                                  : step.assignedTo ? [String(step.assignedTo)] : [];
                                const isChecked = currentAssigned.includes(String(m.id));
                                return (
                                  <label key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', cursor: 'pointer', margin: 0, padding: '2px 6px', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '4px', background: isChecked ? 'rgba(39, 190, 167, 0.08)' : '#f9f9f9', userSelect: 'none' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        let updatedList;
                                        if (e.target.checked) {
                                          updatedList = [...currentAssigned, String(m.id)];
                                        } else {
                                          updatedList = currentAssigned.filter(id => id !== String(m.id));
                                        }
                                        handleAssignStepMember(activeInstance.id, step.id, updatedList);
                                      }}
                                      style={{ cursor: 'pointer', margin: 0 }}
                                    />
                                    <span>{m.name}</span>
                                  </label>
                                );
                              })}
                              {teamMembers.length === 0 && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin colaboradores</span>
                              )}
                            </div>
                          </div>

                          {!isLocked && (
                             <div className="step-action-area" style={{ marginTop: '0.5rem' }}>
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
                                          return nextAssignee ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                              Pasar a {nextAssignee.name} <ArrowRight size={14} />
                                            </span>
                                          ) : (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                              Completar Paso <Check size={14} />
                                            </span>
                                          );
                                        })()}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', width: '100%', fontSize: '0.75rem', padding: '0.35rem', background: 'transparent', border: '1px dashed #CBD5E1', color: 'var(--color-primary)' }}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const helpMsg = `${currentUser?.name || 'Un compañero'} solicita una mano en el paso "${step.title}" de "${activeInstance.instanceName}".`;
                                          try {
                                            await fetch('/api/notifications', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
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
                                            window.dispatchEvent(new Event('notifications-updated'));
                                            if (addToast) addToast("¡Pedido de ayuda enviado al equipo! Un compañero vendrá al rescate.", "success");
                                          } catch (err) {
                                            console.error("Error al pedir ayuda:", err);
                                          }
                                        }}
                                      >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                          <AlertCircle size={13} /> Solicitar Apoyo
                                        </span>
                                      </button>
                                    </>
                                  )}
                                </div>
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

        {/* Footer Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {activeInstance.steps.filter(s => s.isCompleted).length} de {activeInstance.steps.length} pasos completados
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)' }} onClick={() => setPreviewFile(null)}>
          <div className="modal-card" style={{ maxWidth: '700px', width: '90%', padding: '1.5rem', background: '#fff', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700 }}>Previsualización del Documento</h3>
              <button className="close-btn-aesthetic" onClick={() => setPreviewFile(null)}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
              {previewFile.url ? (
                ((previewFile.type && previewFile.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif|svg)$/i.test(previewFile.name || '')) ? (
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

      {/* Visual Google Drive Picker Modal */}
      <GoogleDrivePickerModal
        isOpen={drivePickerState.isOpen}
        onClose={() => setDrivePickerState(prev => ({ ...prev, isOpen: false }))}
        title={drivePickerState.title}
        confirmButtonText="Añadir lo seleccionado"
        allowFolders={drivePickerState.mode === 'subfolder'}
        initialFolderId={activeInstance?.driveFolderId || null}
        initialFolderName={activeInstance?.instanceName || 'Mi Unidad'}
        onSelect={(item) => {
          if (drivePickerState.mode === 'subfolder') {
            setSubfolderLinkInput(item.url || item.webViewLink || `https://drive.google.com/drive/folders/${item.id}`);
            handleSaveExecutionSubfolder(item.url || item.webViewLink || `https://drive.google.com/drive/folders/${item.id}`);
          } else if (drivePickerState.step) {
            handleLinkDriveFileToStep(
              drivePickerState.step,
              item.url || item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
              item.name,
              drivePickerState.checklistItemId
            );
          }
        }}
      />
    </div>
  );
};
