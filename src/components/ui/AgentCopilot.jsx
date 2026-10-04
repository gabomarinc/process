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
  Zap
} from 'lucide-react';
import './AgentCopilot.css';

const DEFAULT_CHIPS = [
  { label: '📊 Resumen del Workspace', prompt: 'Dame un resumen del estado actual de la organización, plantillas y ejecuciones activas.' },
  { label: '➕ Crear plantilla de Onboarding', prompt: 'Crea una nueva plantilla para "Onboarding de Nuevos Clientes" con 4 pasos clave en la categoría Operaciones.' },
  { label: '📋 Añadir columna al Kanban', prompt: 'Agrega una columna llamada "En Revisión Legal" al tablero Kanban.' },
  { label: '👥 Registrar nuevo cliente', prompt: 'Crea un nuevo cliente llamado "InnovaTech Global".' }
];

export default function AgentCopilot({ 
  user, 
  apiKey, 
  onNavigate, 
  onDataModified, 
  addToast,
  isOpenExternal,
  onToggleExternal 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: `👋 ¡Hola **${user?.name?.split(' ')[0] || 'Colega'}**! Soy el **Copiloto Agéntico** de Kônsul Process.\n\nPuedo crear plantillas, iniciar ejecuciones, mover tarjetas en el Kanban, crear clientes y darte análisis en tiempo real mediante **Tool Calling**. ¿Qué deseas coordinar hoy?`,
      actions: []
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

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

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsgId = 'usr_' + Date.now();
    const newMessages = [
      ...messages,
      { id: userMsgId, role: 'user', text: query }
    ];
    setMessages(newMessages);
    setInputValue('');
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
          message: query,
          geminiApiKey: apiKey || localStorage.getItem('gemini_api_key'),
          history: newMessages.slice(-6).map(m => ({
            role: m.role === 'model' ? 'model' : 'user',
            text: m.text
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor del Asistente.');
      }

      const data = await response.json();
      
      const botMsg = {
        id: 'bot_' + Date.now(),
        role: 'model',
        text: data.reply || 'Acción procesada.',
        actions: data.actions || []
      };

      setMessages(prev => [...prev, botMsg]);

      // If actions were executed, trigger data reload in App.jsx
      if (data.refreshRequired && onDataModified) {
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
    setMessages([
      {
        id: 'welcome_reset',
        role: 'model',
        text: `Historial reiniciado. ¿En qué podemos avanzar ahora, **${user?.name?.split(' ')[0] || 'Colega'}**?`,
        actions: []
      }
    ]);
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

          {/* Messages Feed */}
          <div className="agent-copilot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`agent-msg-row ${msg.role}`}>
                <div className={`agent-msg-avatar ${msg.role}`}>
                  {msg.role === 'model' ? (user?.companionAvatar || '⚡') : (user?.name?.[0] || 'U')}
                </div>
                <div className="agent-msg-bubble">
                  {msg.text.split('\n\n').map((paragraph, pIdx) => {
                    // Simple bold renderer
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
            <form 
              className="agent-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <input
                type="text"
                className="agent-chat-input"
                placeholder="Pídele crear plantillas, columnas, mover tarjetas..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="agent-send-btn"
                disabled={!inputValue.trim() || isLoading}
                title="Enviar mensaje"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
