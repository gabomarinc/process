import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  Minus, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  LayoutGrid, 
  FileText, 
  Users, 
  Rocket, 
  Plus, 
  Trash2, 
  Bot,
  Zap,
  BookOpen,
  Paperclip,
  Mic,
  Music,
  Image as ImageIcon
} from 'lucide-react';
import './AgentCopilot.css';

const DEFAULT_CHIPS = [
  { label: '📊 Resumen del Workspace', prompt: 'Dame un resumen del estado actual de la organización, plantillas y ejecuciones activas.' },
  { label: '📖 Guía de Procesos', prompt: 'Explícame las plantillas de procesos disponibles y cómo ejecutarlas paso a paso.' },
  { label: '➕ Crear plantilla de Onboarding', prompt: 'Crea una nueva plantilla para "Onboarding de Nuevos Clientes" con 4 pasos clave en la categoría Operaciones.' },
  { label: '📋 Añadir columna al Kanban', prompt: 'Agrega una columna llamada "En Revisión Legal" al tablero Kanban.' },
  { label: '👥 Registrar nuevo cliente', prompt: 'Crea un nuevo cliente llamado "InnovaTech Global".' }
];

const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(file);
});

const readFileAsArrayBuffer = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsArrayBuffer(file);
});

const readFileAsText = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsText(file);
});

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + (sizes[i] || 'B');
};

const formatTimer = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function AgentCopilot({ 
  user, 
  apiKey, 
  templates = [],
  onNavigate, 
  onDataModified, 
  addToast,
  isOpenExternal,
  onToggleExternal 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const defaultWelcome = {
    id: 'welcome',
    role: 'model',
    text: `👋 ¡Hola **${user?.name?.split(' ')[0] || 'Colega'}**! Soy el **Copiloto Agéntico y Consultor de Procesos** de Kônsul.\n\nPuedo guiarte paso a paso en cualquier plantilla, crear procesos, mover tarjetas en el Kanban, registrar clientes, analizar documentos adjuntos y escuchar tus instrucciones por notas de voz. ¿En qué te ayudo hoy?`,
    actions: []
  };

  const [messages, setMessages] = useState([defaultWelcome]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // File Attachments States
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // Load chat history from localStorage
  useEffect(() => {
    if (user?.id) {
      try {
        const stored = localStorage.getItem(`konsul_chat_${user.id}`);
        if (stored) {
          setMessages(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Error loading chat history', err);
      }
    }
  }, [user?.id]);

  // Save chat history to localStorage
  useEffect(() => {
    if (user?.id && messages.length > 0) {
      // Don't save if it's just the default welcome message
      if (messages.length === 1 && messages[0].id === 'welcome_reset') return;
      localStorage.setItem(`konsul_chat_${user.id}`, JSON.stringify(messages));
    }
  }, [messages, user?.id]);

  // Sync external open state if provided
  useEffect(() => {
    if (isOpenExternal !== undefined) {
      setIsOpen(isOpenExternal);
    }
  }, [isOpenExternal]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onToggleExternal) onToggleExternal(newState);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // File Selection and Parser
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsProcessingFiles(true);
    const parsedList = [];

    for (const file of files) {
      try {
        const ext = file.name.split('.').pop().toLowerCase();
        const isImg = file.type.startsWith('image/');
        const isAud = file.type.startsWith('audio/');

        if (isImg) {
          const dataUrl = await readFileAsDataURL(file);
          const base64Data = dataUrl.split(',')[1];
          parsedList.push({
            id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type || 'image/png',
            mimeType: file.type || 'image/png',
            isImage: true,
            dataUrl,
            base64Data
          });
        } else if (isAud) {
          const dataUrl = await readFileAsDataURL(file);
          const base64Data = dataUrl.split(',')[1];
          parsedList.push({
            id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type || 'audio/webm',
            mimeType: file.type || 'audio/webm',
            isAudio: true,
            dataUrl,
            base64Data
          });
        } else if (ext === 'docx') {
          let text = '';
          const arrayBuffer = await readFileAsArrayBuffer(file);
          if (window.mammoth) {
            const res = await window.mammoth.extractRawText({ arrayBuffer });
            text = res.value || '';
          }
          parsedList.push({
            id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: file.name,
            size: formatFileSize(file.size),
            type: 'docx',
            textContent: text,
            isDocument: true
          });
        } else if (ext === 'pdf') {
          let text = '';
          const arrayBuffer = await readFileAsArrayBuffer(file);
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              text += content.items.map(it => it.str).join(' ') + '\n';
            }
          }
          parsedList.push({
            id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: file.name,
            size: formatFileSize(file.size),
            type: 'pdf',
            textContent: text,
            isDocument: true
          });
        } else {
          // txt, md, csv, json, code
          const text = await readFileAsText(file);
          parsedList.push({
            id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: file.name,
            size: formatFileSize(file.size),
            type: ext,
            textContent: text,
            isDocument: true
          });
        }
      } catch (err) {
        console.error('Error parsing file:', file.name, err);
        if (addToast) addToast(`No se pudo leer el archivo ${file.name}`, 'warning');
      }
    }

    setAttachedFiles(prev => [...prev, ...parsedList]);
    setIsProcessingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Audio Recording Handlers
  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (addToast) addToast('Tu navegador no soporta grabación de micrófono.', 'warning');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);

      // Start Speech Recognition in Spanish
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'es-ES';

        rec.onresult = (event) => {
          let text = '';
          for (let i = 0; i < event.results.length; ++i) {
            text += event.results[i][0].transcript + ' ';
          }
          setLiveTranscript(text.trim());
        };

        rec.onerror = (e) => {
          console.warn('Speech recognition warning:', e.error);
        };

        try {
          rec.start();
          recognitionRef.current = rec;
        } catch (recErr) {
          console.warn('Could not start recognition:', recErr);
        }
      }

      setIsRecording(true);
      setRecordSeconds(0);
      setLiveTranscript('');

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting audio recording:', err);
      if (addToast) addToast('Permiso de micrófono denegado o no disponible.', 'error');
    }
  };

  const cancelVoiceRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    setRecordSeconds(0);
    setLiveTranscript('');
    audioChunksRef.current = [];
  };

  const stopAndSendVoiceRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const recognition = recognitionRef.current;
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }

    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') {
      cancelVoiceRecording();
      return;
    }

    mr.onstop = async () => {
      const mimeType = mr.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);

      let base64Data = '';
      try {
        const dataUrl = await readFileAsDataURL(audioBlob);
        base64Data = dataUrl.split(',')[1];
      } catch (e) {
        console.warn('Could not convert audio to base64', e);
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const transcriptText = liveTranscript.trim() || '🎤 Nota de voz grabada';
      setIsRecording(false);
      setRecordSeconds(0);
      setLiveTranscript('');

      const audioAttachment = {
        id: 'aud_' + Date.now(),
        name: 'Nota_de_voz.webm',
        size: formatFileSize(audioBlob.size),
        type: mimeType,
        mimeType: mimeType,
        base64Data,
        isAudio: true,
        dataUrl: audioUrl
      };

      // Dispatch message immediately with audio metadata
      handleSendMessage(
        transcriptText,
        [audioAttachment],
        { audioUrl, duration: recordSeconds }
      );
    };

    mr.stop();
  };

  const handleSendMessage = async (textToSend, customAttachments = null, audioMeta = null) => {
    const attachmentsToSend = customAttachments !== null ? customAttachments : attachedFiles;
    const query = (textToSend || inputValue).trim();

    if ((!query && (!attachmentsToSend || attachmentsToSend.length === 0)) || isLoading) return;

    const effectiveText = query || (attachmentsToSend.length > 0 ? (attachmentsToSend[0].isAudio ? '🎤 Nota de voz grabada' : '📎 Archivo adjunto') : '');

    const userMsgId = 'usr_' + Date.now();
    const newMsg = {
      id: userMsgId,
      role: 'user',
      text: effectiveText,
      attachments: attachmentsToSend.map(a => ({
        name: a.name,
        size: a.size,
        type: a.type,
        isImage: a.isImage,
        isAudio: a.isAudio,
        dataUrl: a.dataUrl
      })),
      audioUrl: audioMeta?.audioUrl || (attachmentsToSend.find(a => a.isAudio)?.dataUrl) || null
    };

    const newMessages = [...messages, newMsg];
    setMessages(newMessages);
    setInputValue('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: effectiveText,
          attachments: attachmentsToSend.map(a => ({
            name: a.name,
            type: a.type,
            mimeType: a.mimeType,
            base64Data: a.base64Data,
            textContent: a.textContent
          })),
          geminiApiKey: apiKey || localStorage.getItem('gemini_api_key'),
          history: newMessages.slice(-6).map(m => ({
            role: m.role === 'model' ? 'model' : 'user',
            text: m.text
          }))
        })
      });

      let data = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.warn('Could not parse response JSON:', jsonErr);
      }

      if (!response.ok && (!data || !data.reply)) {
        throw new Error(data?.error || data?.reply || 'Error al conectar con el servidor del Asistente.');
      }
      
      const botMsg = {
        id: 'bot_' + Date.now(),
        role: 'model',
        text: data?.reply || 'Acción procesada.',
        actions: data?.actions || []
      };

      setMessages(prev => [...prev, botMsg]);

      // If actions were executed, trigger data reload in App.jsx
      if (data?.refreshRequired && onDataModified) {
        onDataModified();
        if (addToast) {
          addToast('Acción agéntica completada y sincronizada', 'success');
        }
      }

    } catch (err) {
      console.error('Agent chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'model',
          text: `⚠️ **Error:** ${err.message || 'No se pudo comunicar con el agente.'}`,
          actions: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const welcomeReset = {
      id: 'welcome_reset',
      role: 'model',
      text: `Historial reiniciado. ¿En qué podemos avanzar ahora, **${user?.name?.split(' ')[0] || 'Colega'}**?`,
      actions: []
    };
    setMessages([welcomeReset]);
    if (user?.id) {
      localStorage.removeItem(`konsul_chat_${user.id}`);
    }
  };

  const renderActionCard = (act, idx) => {
    const isSuccess = act.success !== false;
    const { tool, result, args } = act;

    switch (tool) {
      case 'create_process_template':
        return (
          <div key={idx} className={`agent-action-card ${isSuccess ? 'success' : 'error'}`}>
            <div className="agent-action-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={14} /> Plantilla de Proceso
              </span>
              <span>{isSuccess ? '✅ Creada' : '❌ Error'}</span>
            </div>
            <div className="agent-action-title">{result?.title || args?.title}</div>
            <div className="agent-action-details">
              Categoría: <strong>{result?.category || args?.category}</strong> • {result?.stepsCount || (args?.steps || []).length} pasos
            </div>
            {isSuccess && onNavigate && (
              <button className="agent-action-cta-btn" onClick={() => { onNavigate('templates'); setIsOpen(false); }}>
                Ver Catálogo de Plantillas <ArrowRight size={12} />
              </button>
            )}
          </div>
        );

      case 'launch_process_execution':
        return (
          <div key={idx} className={`agent-action-card ${isSuccess ? 'success' : 'error'}`}>
            <div className="agent-action-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Rocket size={14} /> Ejecución Iniciada
              </span>
              <span>{isSuccess ? '🚀 En marcha' : '❌ Error'}</span>
            </div>
            <div className="agent-action-title">{result?.instanceName || args?.instanceName}</div>
            <div className="agent-action-details">
              Plantilla: <strong>{result?.templateTitle}</strong> • Prioridad: {result?.priority}
            </div>
            {isSuccess && onNavigate && (
              <button className="agent-action-cta-btn" onClick={() => { onNavigate('kanban'); setIsOpen(false); }}>
                Ver en Tablero Kanban <ArrowRight size={12} />
              </button>
            )}
          </div>
        );

      case 'update_kanban_columns':
        return (
          <div key={idx} className={`agent-action-card ${isSuccess ? 'success' : 'error'}`}>
            <div className="agent-action-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <LayoutGrid size={14} /> Tablero Kanban
              </span>
              <span>{isSuccess ? '📋 Actualizado' : '❌ Error'}</span>
            </div>
            <div className="agent-action-title">Nuevas Columnas</div>
            <div className="agent-action-details">
              {(result?.columns || args?.columns || []).join(' → ')}
            </div>
            {isSuccess && onNavigate && (
              <button className="agent-action-cta-btn" onClick={() => { onNavigate('kanban'); setIsOpen(false); }}>
                Abrir Tablero <ArrowRight size={12} />
              </button>
            )}
          </div>
        );

      case 'move_execution_status':
        return (
          <div key={idx} className={`agent-action-card ${isSuccess ? 'success' : 'error'}`}>
            <div className="agent-action-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={14} /> Movimiento en Kanban
              </span>
              <span>{isSuccess ? '🔄 Movido' : '❌ Error'}</span>
            </div>
            <div className="agent-action-title">{result?.instanceName}</div>
            <div className="agent-action-details">
              {result?.previousStatus} → <strong>{result?.newStatus}</strong> (Prioridad: {result?.priority})
            </div>
            {isSuccess && onNavigate && (
              <button className="agent-action-cta-btn" onClick={() => { onNavigate('kanban'); setIsOpen(false); }}>
                Ver en Tablero <ArrowRight size={12} />
              </button>
            )}
          </div>
        );

      case 'create_client':
        return (
          <div key={idx} className={`agent-action-card ${isSuccess ? 'success' : 'error'}`}>
            <div className="agent-action-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={14} /> Directorio de Clientes
              </span>
              <span>{isSuccess ? '👤 Registrado' : '❌ Error'}</span>
            </div>
            <div className="agent-action-title">{result?.name || args?.name}</div>
            {isSuccess && onNavigate && (
              <button className="agent-action-cta-btn" onClick={() => { onNavigate('clients'); setIsOpen(false); }}>
                Ver Directorio <ArrowRight size={12} />
              </button>
            )}
          </div>
        );

      case 'add_team_member':
        return (
          <div key={idx} className={`agent-action-card ${isSuccess ? 'success' : 'error'}`}>
            <div className="agent-action-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={14} /> Equipo Kônsul
              </span>
              <span>{isSuccess ? '🎉 Miembro Creado' : '❌ Error'}</span>
            </div>
            <div className="agent-action-title">{result?.name || args?.name}</div>
            <div className="agent-action-details">
              Rol: <strong>{result?.role || args?.role}</strong> • Email: {result?.email || args?.email}
            </div>
            {isSuccess && onNavigate && (
              <button className="agent-action-cta-btn" onClick={() => { onNavigate('team'); setIsOpen(false); }}>
                Ver Directorio de Equipo <ArrowRight size={12} />
              </button>
            )}
          </div>
        );

      default:
        return (
          <div key={idx} className={`agent-action-card ${isSuccess ? 'success' : 'error'}`}>
            <div className="agent-action-header">
              <span>Acción: {tool}</span>
              <span>{isSuccess ? 'Completada' : 'Falló'}</span>
            </div>
            <div className="agent-action-details">
              {JSON.stringify(result || args)}
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          className="agent-copilot-trigger"
          onClick={handleToggle}
          title="Abrir Copiloto Agéntico Kônsul"
        >
          <div className="agent-trigger-avatar">
            {user?.companionAvatar || '⚡'}
          </div>
          <span>Kônsul Copilot</span>
          <div className="agent-trigger-pulse">
            <div className="agent-pulse-dot" />
            <div className="agent-pulse-ring" />
          </div>
        </button>
      )}

      {/* Slide-over Window */}
      {isOpen && (
        <div className="agent-copilot-window">
          {/* Header */}
          <div className="agent-copilot-header">
            <div className="agent-copilot-profile">
              <div className="agent-copilot-avatar">
                {user?.companionAvatar || '⚡'}
              </div>
              <div className="agent-copilot-titles">
                <h3>
                  {user?.companionName || 'Kônsul Copilot'}
                  <span className="agent-copilot-badge">MCP</span>
                </h3>
                <div className="agent-copilot-status">
                  <div className="agent-copilot-status-dot" />
                  <span>Arquitectura Agéntica Activa</span>
                </div>
              </div>
            </div>

            <div className="agent-copilot-header-actions">
              <button 
                className="agent-icon-btn" 
                onClick={handleClearHistory} 
                title="Limpiar chat"
              >
                <Trash2 size={16} />
              </button>
              <button 
                className="agent-icon-btn" 
                onClick={handleToggle} 
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Process Guide Selector (Old chat feature integration) */}
          {Array.isArray(templates) && templates.length > 0 && (
            <div className="agent-context-bar">
              <BookOpen size={14} color="#27BEA5" style={{ flexShrink: 0 }} />
              <select
                className="agent-template-select"
                value={selectedTemplateId}
                onChange={(e) => {
                  const tId = e.target.value;
                  setSelectedTemplateId(tId);
                  if (tId) {
                    const temp = templates.find(t => t.id === tId);
                    if (temp) {
                      handleSendMessage(`Quiero consultar detalles y dudas sobre el proceso "${temp.title}". ¿Podrías resumirme sus objetivos y qué se hace en cada uno de sus pasos?`);
                    }
                  }
                }}
              >
                <option value="">-- Consultar o guiar un proceso específico --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.category || 'General'})</option>
                ))}
              </select>
            </div>
          )}

          {/* Messages Feed */}
          <div className="agent-copilot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`agent-msg-row ${msg.role}`}>
                <div className={`agent-msg-avatar ${msg.role}`}>
                  {msg.role === 'model' ? (user?.companionAvatar || '⚡') : (user?.name?.[0] || 'U')}
                </div>
                <div className="agent-msg-bubble">
                  {/* Render Attached Files inside Message Bubble */}
                  {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                    <div className="agent-msg-attachments-container">
                      {msg.attachments.map((att, aIdx) => (
                        att.isImage ? (
                          <div key={aIdx} className="agent-msg-att-img-wrap">
                            <img src={att.dataUrl} alt={att.name} className="agent-msg-att-img" />
                            <span className="agent-msg-att-name">{att.name} ({att.size})</span>
                          </div>
                        ) : att.isAudio ? null : (
                          <div key={aIdx} className="agent-msg-att-file-pill">
                            <FileText size={14} className="icon-blue" />
                            <span className="agent-msg-att-file-name" title={att.name}>{att.name}</span>
                            <span className="agent-msg-att-file-size">{att.size}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {/* Render Voice Note Audio Player if present */}
                  {msg.audioUrl && (
                    <div className="agent-msg-audio-wrapper">
                      <div className="agent-audio-badge">
                        <Mic size={13} color="#27BEA5" />
                        <span>Mensaje de Voz</span>
                      </div>
                      <audio controls src={msg.audioUrl} className="agent-inline-audio" />
                    </div>
                  )}

                  {/* Message Text */}
                  {msg.text && msg.text.split('\n\n').map((paragraph, pIdx) => {
                    const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={pIdx}>
                        {parts.map((part, partIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    );
                  })}

                  {/* Render Generative UI Action Cards if present */}
                  {Array.isArray(msg.actions) && msg.actions.length > 0 && (
                    <div className="agent-action-cards">
                      {msg.actions.map((act, actIdx) => renderActionCard(act, actIdx))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="agent-msg-row model">
                <div className="agent-msg-avatar model">
                  {user?.companionAvatar || '⚡'}
                </div>
                <div className="agent-msg-bubble">
                  <div className="agent-typing-indicator">
                    <div className="agent-typing-dot" />
                    <div className="agent-typing-dot" />
                    <div className="agent-typing-dot" />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Suggestion Chips (show when messages are few) */}
            {messages.length <= 2 && !isLoading && (
              <div className="agent-suggestions-container">
                <div className="agent-suggestions-title">Acciones Rápidas</div>
                <div className="agent-chips-grid">
                  {DEFAULT_CHIPS.map((chip, chipIdx) => (
                    <button
                      key={chipIdx}
                      className="agent-chip-btn"
                      onClick={() => handleSendMessage(chip.prompt)}
                    >
                      <Sparkles size={12} color="#27BEA5" />
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="agent-copilot-footer">
            {/* Attachment Preview Strip */}
            {attachedFiles.length > 0 && (
              <div className="agent-attachment-strip">
                {attachedFiles.map((file) => (
                  <div key={file.id} className="agent-attachment-pill">
                    {file.isImage ? (
                      <img src={file.dataUrl} alt={file.name} className="agent-att-mini-thumb" />
                    ) : file.isAudio ? (
                      <Music size={14} className="icon-green" />
                    ) : (
                      <FileText size={14} className="icon-blue" />
                    )}
                    <span className="agent-att-name" title={file.name}>{file.name}</span>
                    <span className="agent-att-size">{file.size}</span>
                    <button
                      type="button"
                      className="agent-att-remove-btn"
                      onClick={() => setAttachedFiles(prev => prev.filter(f => f.id !== file.id))}
                      title="Eliminar archivo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Recording Bar (Active when recording audio) */}
            {isRecording ? (
              <div className="agent-recording-bar">
                <div className="agent-recording-indicator">
                  <div className="agent-rec-dot" />
                  <span className="agent-rec-timer">{formatTimer(recordSeconds)}</span>
                </div>

                <div className="agent-rec-transcript">
                  {liveTranscript || "Grabando audio... habla ahora"}
                </div>

                <div className="agent-rec-actions">
                  <button
                    type="button"
                    className="agent-rec-cancel-btn"
                    onClick={cancelVoiceRecording}
                    title="Cancelar grabación"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    type="button"
                    className="agent-rec-send-btn"
                    onClick={stopAndSendVoiceRecording}
                    title="Finalizar y enviar audio"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <form 
                className="agent-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,audio/*"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className="agent-icon-action-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Adjuntar archivo o documento (.pdf, .docx, .png, .txt, etc.)"
                  disabled={isLoading || isProcessingFiles}
                >
                  <Paperclip size={17} />
                </button>

                <input
                  type="text"
                  className="agent-chat-input"
                  placeholder={isProcessingFiles ? "Procesando archivo..." : "Escribe o adjunta un proceso/audio..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading || isProcessingFiles}
                />

                <button
                  type="button"
                  className="agent-icon-action-btn mic-btn"
                  onClick={startVoiceRecording}
                  title="Grabar y enviar nota de voz"
                  disabled={isLoading || isProcessingFiles}
                >
                  <Mic size={17} />
                </button>

                <button 
                  type="submit" 
                  className="agent-send-btn"
                  disabled={(!inputValue.trim() && attachedFiles.length === 0) || isLoading || isProcessingFiles}
                  title="Enviar mensaje"
                >
                  <Send size={15} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
