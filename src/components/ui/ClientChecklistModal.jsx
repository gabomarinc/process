import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check,
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Plus, 
  Sparkles,
  LayoutGrid, 
  FileText, 
  Video, 
  DollarSign, 
  CheckSquare, 
  Hash, 
  Star,
  Rocket,
  ArrowRight,
  Clock,
  Layers,
  Calendar,
  Lock,
  Unlock,
  Link2,
  ShieldAlert,
  SlidersHorizontal,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  Edit2,
  AlertTriangle,
  Folder,
  Send,
  User,
  Info
} from 'lucide-react';
import { 
  normalizeChecklistItems, 
  getClientTrafficLightStatus,
  isChecklistItemDone,
  isChecklistItemBlockedByExecution
} from '../../utils/clientSemaforo';
import './ClientChecklistModal.css';

const CLIENT_STAGES = ['Nuevo', 'Contactado', 'Onboarding', 'En Proceso', 'Activo'];

const SUGGESTED_TEMPLATE_ITEMS = [
  { id: 'item_video_sug', name: 'Video', type: 'counter', checked: false, current: 0, target: 6 },
  { id: 'item_post_sug', name: 'Post', type: 'counter', checked: false, current: 0, target: 12 },
  { id: 'item_carrusel_sug', name: 'Carrusel', type: 'counter', checked: false, current: 0, target: 4 },
  { id: 'item_factura_sug', name: 'Factura Paga', type: 'boolean', checked: false },
  { id: 'item_ads_sug', name: 'Ads Según Cliente', type: 'rating', rating: 'Excelente' }
];

export default function ClientChecklistModal({
  isOpen,
  onClose,
  client,
  instances = [],
  onSaveChecklist,
  onDeleteClient,
  onOpenInstance,
  onLaunchForClient
}) {
  if (!isOpen || !client) return null;

  const [activeTab, setActiveTab] = useState('checklist'); // 'detalles' | 'checklist' | 'active' | 'completed'
  const [items, setItems] = useState(() => normalizeChecklistItems(client.checklist));
  const [clientEmail, setClientEmail] = useState(client.email || '');
  const [clientPhone, setClientPhone] = useState(client.phone || '');
  const [clientStage, setClientStage] = useState(client.stage || 'Nuevo');
  const [clientNotes, setClientNotes] = useState(client.notes || '');
  const [clientDriveUrl, setClientDriveUrl] = useState(
    client.drive_folder_url || (client.drive_folder_id ? `https://drive.google.com/drive/folders/${client.drive_folder_id}` : '')
  );

  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Item being edited in modal/drawer
  const [showAddModal, setShowAddModal] = useState(false);

  // New Item Creator State
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('counter'); // 'counter' | 'boolean' | 'rating'
  const [newItemTarget, setNewItemTarget] = useState(4);
  const [newItemAssociatedInstanceId, setNewItemAssociatedInstanceId] = useState('');
  const [newItemIsGate, setNewItemIsGate] = useState(false);
  const [newItemGateType, setNewItemGateType] = useState('blocks_execution'); // 'blocks_execution' | 'blocked_by_execution'

  useEffect(() => {
    if (client) {
      setItems(normalizeChecklistItems(client.checklist));
      setClientEmail(client.email || '');
      setClientPhone(client.phone || '');
      setClientStage(client.stage || 'Nuevo');
      setClientNotes(client.notes || '');
      setClientDriveUrl(
        client.drive_folder_url || (client.drive_folder_id ? `https://drive.google.com/drive/folders/${client.drive_folder_id}` : '')
      );
    }
  }, [client]);

  const semaforo = getClientTrafficLightStatus({ items });

  // Calculate client executions
  const clientNameLower = (client.name || '').toLowerCase();
  const clientInstances = instances.filter(inst => {
    if (!inst) return false;
    const nameLower = (inst.instanceName || '').toLowerCase();
    const clientField = (inst.client_name || '').toLowerCase();
    const clientIdField = inst.clientId || inst.client_id;
    return (clientIdField && String(clientIdField) === String(client.id)) ||
           nameLower.includes(clientNameLower) || 
           clientField.includes(clientNameLower);
  });

  const activeInstances = clientInstances.filter(inst => {
    const steps = inst.steps || [];
    return steps.length === 0 || !steps.every(s => s.isCompleted);
  });

  const completedInstances = clientInstances.filter(inst => {
    const steps = inst.steps || [];
    return steps.length > 0 && steps.every(s => s.isCompleted);
  });

  // Initials generator
  const getInitials = (name = '') => {
    if (!name) return 'CL';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Formatted date
  const registeredDateFormatted = client.created_at 
    ? new Date(client.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Fecha no registrada';

  // Check if an item is locked by an unfinished execution
  const checkExecutionBlock = (item) => {
    const blockInfo = isChecklistItemBlockedByExecution(item, instances);
    if (blockInfo.isBlocked) {
      alert(`🔒 Requerimiento Bloqueado:\n\nDebes finalizar todos los pasos de la ejecución "${blockInfo.instance.instanceName}" (${blockInfo.remainingSteps} pasos pendientes) para poder marcar o evaluar este requerimiento.`);
      return true;
    }
    return false;
  };

  // Toggle boolean item or counter item
  const handleToggleCheck = (itemId) => {
    const target = items.find(i => i.id === itemId);
    if (target && !target.checked && checkExecutionBlock(target)) {
      return;
    }

    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const nextChecked = !item.checked;
      let nextCurrent = item.current || 0;
      const targetCount = item.target || 1;

      if (item.type === 'counter') {
        if (nextChecked && nextCurrent < targetCount) {
          nextCurrent = targetCount;
        } else if (!nextChecked && nextCurrent === targetCount) {
          nextCurrent = 0;
        }
        return { ...item, checked: nextChecked, current: nextCurrent };
      }

      return { ...item, checked: nextChecked };
    }));
  };

  // Update counter item values
  const handleUpdateCount = (itemId, key, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    const targetItem = items.find(i => i.id === itemId);
    if (targetItem && key === 'current' && num > (targetItem.current || 0) && checkExecutionBlock(targetItem)) {
      return;
    }

    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updated = { ...item, [key]: num };
      const targetCount = key === 'target' ? num : (item.target || 1);
      const currentCount = key === 'current' ? num : (item.current || 0);

      if (targetCount > 0 && currentCount >= targetCount) {
        updated.checked = true;
      } else if (key === 'current' && currentCount < targetCount) {
        updated.checked = false;
      }

      return updated;
    }));
  };

  // Change rating for rating items
  const handleRatingChange = (itemId, rating) => {
    const targetItem = items.find(i => i.id === itemId);
    if (targetItem && (rating === 'Excelente' || rating === 'Bueno') && checkExecutionBlock(targetItem)) {
      return;
    }

    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, rating };
    }));
  };

  // Delete an item
  const handleDeleteItem = (itemId) => {
    const target = items.find(i => i.id === itemId);
    const itemName = target?.name || 'este requerimiento';
    if (window.confirm(`¿Estás seguro de que deseas eliminar el requerimiento "${itemName}" del cliente?`)) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  // Add a new dynamic item
  const handleAddItemSubmit = (e) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem = {
      id: 'item_' + Date.now(),
      name: newItemName.trim(),
      type: newItemType,
      associatedInstanceId: newItemAssociatedInstanceId || null,
      isGate: !!newItemIsGate,
      gateType: newItemIsGate ? newItemGateType : 'blocks_execution'
    };

    if (newItemType === 'boolean') {
      newItem.checked = false;
    } else if (newItemType === 'counter') {
      newItem.checked = false;
      newItem.current = 0;
      newItem.target = Math.max(1, parseInt(newItemTarget, 10) || 1);
    } else if (newItemType === 'rating') {
      newItem.rating = 'Excelente';
    }

    setItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemTarget(4);
    setNewItemAssociatedInstanceId('');
    setNewItemIsGate(false);
    setNewItemGateType('blocks_execution');
    setShowAddModal(false);
  };

  // Load Suggested Template
  const handleLoadSuggestedTemplate = () => {
    const newItems = SUGGESTED_TEMPLATE_ITEMS.map((item, idx) => ({
      ...item,
      id: `item_tpl_${Date.now()}_${idx}`
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  // Save changes to backend
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSaveChecklist) {
        await onSaveChecklist(
          client.id, 
          { items }, 
          clientEmail,
          {
            phone: clientPhone,
            stage: clientStage,
            notes: clientNotes,
            driveFolderUrl: clientDriveUrl
          }
        );
      }
      onClose();
    } catch (err) {
      console.error('Error saving checklist', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getItemIcon = (item) => {
    const nameLower = (item.name || '').toLowerCase();
    if (nameLower.includes('video') || nameLower.includes('reel')) return <Video size={16} />;
    if (nameLower.includes('post')) return <FileText size={16} />;
    if (nameLower.includes('carrusel')) return <LayoutGrid size={16} />;
    if (nameLower.includes('factura') || nameLower.includes('pago')) return <DollarSign size={16} />;
    if (item.type === 'counter') return <Hash size={16} />;
    if (item.type === 'rating') return <Star size={16} />;
    return <CheckSquare size={16} />;
  };

  const currentStageIdx = CLIENT_STAGES.findIndex(s => s.toLowerCase() === (clientStage || 'nuevo').toLowerCase());
  const activeStageIdx = currentStageIdx >= 0 ? currentStageIdx : 0;

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal-card" onClick={e => e.stopPropagation()}>
        
        {/* ═══════════════════════════════════════════════════════════════
            HEADER: Dark Emerald Gradient ("Omar Ortoz" Design)
        ═══════════════════════════════════════════════════════════════ */}
        <div className="crm-modal-header">
          {/* Top Meta Bar */}
          <div className="crm-header-topbar">
            <div className="crm-header-meta">
              <span className="crm-meta-text">
                Cliente Kônsul Process • Registrado el {registeredDateFormatted}
              </span>
              {clientDriveUrl && (
                <a
                  href={clientDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="crm-drive-badge"
                  title="Abrir carpeta vinculada de Google Drive"
                >
                  <Folder size={12} color="#27BEA5" />
                  <span>Google Drive</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>

            <div className="crm-header-actions">
              {onDeleteClient && (
                <button 
                  className="crm-header-delete-btn" 
                  onClick={() => {
                    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente al cliente "${client.name}" y todos sus requerimientos? Esta acción no se puede deshacer.`)) {
                      onDeleteClient(client.id);
                      onClose();
                    }
                  }} 
                  title="Eliminar Cliente"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button className="crm-close-btn" onClick={onClose} title="Cerrar modal">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Profile Identity Banner */}
          <div className="crm-identity-banner">
            <div className="crm-identity-main">
              {/* Vibrant Squircle Avatar */}
              <div className="crm-avatar-squircle">
                {getInitials(client.name)}
              </div>

              {/* Title & Metadata */}
              <div className="crm-identity-info">
                <h1 className="crm-client-name" title={client.name}>
                  {client.name}
                </h1>
                <div className="crm-client-tags">
                  <span className="crm-tag-highlight">{clientStage}</span>
                  <span>•</span>
                  <span>{activeInstances.length} Procesos Activos</span>
                  <span>•</span>
                  <span>{completedInstances.length} Completados</span>
                  {clientEmail && (
                    <>
                      <span>•</span>
                      <span className="crm-tag-email">{clientEmail}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Semáforo Score Card */}
            <div className="crm-score-card">
              <div className="crm-score-number" style={{ color: semaforo.color }}>
                {semaforo.percentage}%
              </div>
              <div className="crm-score-label">SEMÁFORO</div>
              <div 
                className="crm-score-badge"
                style={{
                  background: semaforo.bg,
                  color: semaforo.color,
                  border: `1px solid ${semaforo.badgeBorder}`
                }}
              >
                {semaforo.statusLabel}
              </div>
            </div>
          </div>

          {/* Stepper / Pipeline Progress Trail */}
          <div className="crm-pipeline-container">
            <div className="crm-pipeline-header">
              <span className="crm-pipeline-title">ETAPA DEL CLIENTE</span>
              <span className="crm-pipeline-hint">Haz clic en una etapa para actualizar</span>
            </div>

            <div className="crm-pipeline-trail">
              {CLIENT_STAGES.map((st, idx) => {
                const isPassed = idx < activeStageIdx;
                const isCurrent = idx === activeStageIdx;

                return (
                  <React.Fragment key={st}>
                    <div 
                      className={`crm-pipeline-node ${isCurrent ? 'current' : isPassed ? 'passed' : 'upcoming'}`}
                      onClick={() => setClientStage(st)}
                      title={`Cambiar etapa a: ${st}`}
                    >
                      <div className="crm-pipeline-circle">
                        {isPassed || isCurrent ? <Check size={14} strokeWidth={3} /> : <div className="crm-pipeline-dot" />}
                      </div>
                      <span className="crm-pipeline-node-label">{st}</span>
                    </div>

                    {idx < CLIENT_STAGES.length - 1 && (
                      <div className={`crm-pipeline-line ${idx < activeStageIdx ? 'active' : ''}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Action Pills Bar */}
          <div className="crm-actions-bar">
            <button 
              className="crm-action-pill primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={15} /> Agregar Requerimiento
            </button>

            {clientPhone ? (
              <a 
                href={`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="crm-action-pill"
              >
                <MessageCircle size={14} color="#25D366" /> WhatsApp
              </a>
            ) : (
              <button 
                className="crm-action-pill disabled-pill"
                onClick={() => setActiveTab('detalles')}
                title="Configura el teléfono en la pestaña Detalles"
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
            )}

            {clientPhone ? (
              <a href={`tel:${clientPhone}`} className="crm-action-pill">
                <Phone size={14} /> Llamar
              </a>
            ) : (
              <button 
                className="crm-action-pill disabled-pill"
                onClick={() => setActiveTab('detalles')}
                title="Configura el teléfono en la pestaña Detalles"
              >
                <Phone size={14} /> Llamar
              </button>
            )}

            {clientEmail ? (
              <a href={`mailto:${clientEmail}`} className="crm-action-pill">
                <Mail size={14} /> Enviar Correo
              </a>
            ) : (
              <button 
                className="crm-action-pill disabled-pill"
                onClick={() => setActiveTab('detalles')}
                title="Configura el correo en la pestaña Detalles"
              >
                <Mail size={14} /> Correo
              </button>
            )}

            {onLaunchForClient && (
              <button 
                className="crm-action-pill"
                onClick={() => onLaunchForClient(client)}
              >
                <Rocket size={14} color="#27BEA5" /> Lanzar Proceso
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TABS NAVIGATION
        ═══════════════════════════════════════════════════════════════ */}
        <div className="crm-tabs-bar">
          <button 
            type="button"
            className={`crm-tab-button ${activeTab === 'checklist' ? 'active' : ''}`}
            onClick={() => setActiveTab('checklist')}
          >
            <CheckSquare size={15} /> Checklist & Semáforo ({items.length})
          </button>
          <button 
            type="button"
            className={`crm-tab-button ${activeTab === 'detalles' ? 'active' : ''}`}
            onClick={() => setActiveTab('detalles')}
          >
            <FileText size={15} /> Detalles & Contacto
          </button>
          <button 
            type="button"
            className={`crm-tab-button ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <Rocket size={15} /> Procesos Activos ({activeInstances.length})
          </button>
          <button 
            type="button"
            className={`crm-tab-button ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <CheckCircle2 size={15} /> Historial Completado ({completedInstances.length})
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MODAL BODY CONTENT
        ═══════════════════════════════════════════════════════════════ */}
        <div className="crm-modal-body">

          {/* TAB 1: CHECKLIST & REQUERIMIENTOS */}
          {activeTab === 'checklist' && (
            <div className="crm-checklist-view">
              
              {/* Semáforo Status Summary Header */}
              <div 
                className="crm-semaforo-banner"
                style={{
                  background: semaforo.bg,
                  borderColor: semaforo.badgeBorder
                }}
              >
                <div className="crm-semaforo-left">
                  <span 
                    className="crm-semaforo-status-pill"
                    style={{ background: semaforo.color }}
                  >
                    {semaforo.statusLabel}
                  </span>
                  <span className="crm-semaforo-stats" style={{ color: semaforo.color }}>
                    <strong>{semaforo.percentage}% Cumplido</strong> • {semaforo.completedCount} de {semaforo.totalCount} requerimientos completados
                  </span>
                </div>

                <div className="crm-semaforo-actions">
                  {items.length === 0 && (
                    <button 
                      type="button" 
                      className="crm-btn-suggested"
                      onClick={handleLoadSuggestedTemplate}
                      title="Cargar Video, Post, Carrusel, Factura Paga y Ads según cliente"
                    >
                      <Sparkles size={14} /> Cargar Plantilla Sugerida
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="crm-btn-add-item"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus size={14} /> Agregar Requerimiento
                  </button>
                </div>
              </div>

              {/* EMPTY STATE */}
              {items.length === 0 ? (
                <div className="crm-empty-state-card">
                  <div className="crm-empty-icon-wrap">
                    <Sparkles size={36} color="#27BEA5" />
                  </div>
                  <h3 className="crm-empty-title">Este cliente aún no tiene requerimientos</h3>
                  <p className="crm-empty-desc">
                    Los clientes nuevos inician sin items predeterminados. Puedes crear requerimientos personalizados o cargar la plantilla sugerida con un solo clic.
                  </p>
                  <div className="crm-empty-actions">
                    <button 
                      type="button" 
                      className="crm-empty-btn-primary"
                      onClick={handleLoadSuggestedTemplate}
                    >
                      <Sparkles size={16} /> Cargar Plantilla Sugerida (Videos, Posts, Factura, Ads)
                    </button>
                    <button 
                      type="button" 
                      className="crm-empty-btn-secondary"
                      onClick={() => setShowAddModal(true)}
                    >
                      <Plus size={16} /> Crear Requerimiento Personalizado
                    </button>
                  </div>
                </div>
              ) : (
                /* ITEMS LIST */
                <div className="crm-items-grid">
                  {items.map((item) => {
                    const isDone = isChecklistItemDone(item);
                    const execBlockInfo = isChecklistItemBlockedByExecution(item, instances);
                    const linkedInstance = clientInstances.find(i => String(i.id) === String(item.associatedInstanceId));

                    return (
                      <div 
                        key={item.id} 
                        className={`crm-item-card ${isDone ? 'completed' : ''} ${item.type} ${execBlockInfo.isBlocked ? 'locked' : ''}`}
                      >
                        {/* ITEM TOP BAR: ICON, NAME, ACTIONS */}
                        <div className="crm-item-topbar">
                          <div className="crm-item-header-left">
                            <div className="crm-item-icon-box">
                              {getItemIcon(item)}
                            </div>
                            <div>
                              <span className="crm-item-name">{item.name}</span>
                              <div className="crm-item-badges-row">
                                <span className={`crm-type-badge ${item.type}`}>
                                  {item.type === 'counter' ? 'Contador' : item.type === 'rating' ? 'Calificación / Ads' : 'Checkbox'}
                                </span>
                                {linkedInstance && (
                                  <span className="crm-tag-linked" title={`Vinculado a: ${linkedInstance.instanceName}`}>
                                    <Link2 size={11} /> {linkedInstance.instanceName}
                                  </span>
                                )}
                                {item.isGate && (
                                  <span className="crm-tag-gate" title="Punto de Bloqueo activo">
                                    <Lock size={11} /> Gate Activo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="crm-item-header-actions">
                            <button
                              type="button"
                              className="crm-item-action-icon edit"
                              onClick={() => setEditingItem(item)}
                              title="Editar configuración o nombre"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="crm-item-action-icon delete"
                              onClick={() => handleDeleteItem(item.id)}
                              title="Eliminar requerimiento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* ITEM CONTROLS BY TYPE */}
                        {item.type === 'counter' && (
                          <div className="crm-item-counter-body">
                            <div className="crm-counter-controls">
                              <button
                                type="button"
                                className="crm-counter-btn"
                                onClick={() => handleUpdateCount(item.id, 'current', (item.current || 0) - 1)}
                                disabled={(item.current || 0) <= 0}
                              >
                                -
                              </button>
                              <input 
                                type="number" 
                                className="crm-counter-input"
                                value={item.current || 0}
                                min="0"
                                onChange={e => handleUpdateCount(item.id, 'current', e.target.value)}
                              />
                              <button
                                type="button"
                                className="crm-counter-btn"
                                onClick={() => handleUpdateCount(item.id, 'current', (item.current || 0) + 1)}
                              >
                                +
                              </button>
                              <span className="crm-counter-divider">/</span>
                              <div className="crm-counter-target-box">
                                <span className="crm-counter-target-label">Meta:</span>
                                <input 
                                  type="number"
                                  className="crm-counter-target-input"
                                  value={item.target || 1}
                                  min="1"
                                  onChange={e => handleUpdateCount(item.id, 'target', e.target.value)}
                                  title="Meta a alcanzar"
                                />
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="crm-item-prog-bar-bg">
                              <div 
                                className="crm-item-prog-bar-fill"
                                style={{
                                  width: `${Math.min(100, Math.round(((item.current || 0) / (item.target || 1)) * 100))}%`
                                }}
                              />
                            </div>

                            <div className="crm-counter-footer">
                              <span className="crm-counter-status-text">
                                {isDone ? '🎉 Meta completada' : `${Math.max(0, (item.target || 1) - (item.current || 0))} restantes`}
                              </span>
                              <label className="crm-fast-toggle-check">
                                <input 
                                  type="checkbox"
                                  checked={!!item.checked}
                                  onChange={() => handleToggleCheck(item.id)}
                                />
                                <span>Marcar Cumplido</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {item.type === 'boolean' && (
                          <div className="crm-item-boolean-body">
                            <label className="crm-boolean-toggle-label">
                              <input 
                                type="checkbox"
                                className="crm-boolean-input"
                                checked={!!item.checked}
                                onChange={() => handleToggleCheck(item.id)}
                              />
                              <span className="crm-boolean-custom-box">
                                {item.checked && <Check size={16} strokeWidth={3} />}
                              </span>
                              <span className="crm-boolean-text">
                                {item.checked ? 'Completado y Verificado' : 'Pendiente de realizar'}
                              </span>
                            </label>
                          </div>
                        )}

                        {item.type === 'rating' && (
                          <div className="crm-item-rating-body">
                            <div className="crm-rating-options">
                              {['Excelente', 'Bueno', 'Regular', 'Malo', 'No incluido'].map((r) => {
                                const isSelected = (item.rating || 'Excelente') === r;
                                return (
                                  <button
                                    key={r}
                                    type="button"
                                    className={`crm-rating-chip ${r.toLowerCase().replace(/\s+/g, '-')} ${isSelected ? 'active' : ''}`}
                                    onClick={() => handleRatingChange(item.id, r)}
                                  >
                                    {r}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Gate lock alert if blocked by an execution */}
                        {execBlockInfo.isBlocked && (
                          <div className="crm-locked-alert">
                            <Lock size={12} /> Bloqueado: Esperando finalización de "{execBlockInfo.instance?.instanceName}" ({execBlockInfo.remainingSteps} pasos pendientes)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETALLES & CONTACTO */}
          {activeTab === 'detalles' && (
            <div className="crm-details-view">
              <div className="crm-details-grid">
                
                {/* Contact Information Card */}
                <div className="crm-card">
                  <div className="crm-card-header">
                    <User size={18} color="#27BEA5" />
                    <h3>Información de Contacto</h3>
                  </div>
                  <div className="crm-card-body">
                    <div className="crm-field-group">
                      <label>Nombre del Cliente</label>
                      <input 
                        type="text" 
                        className="crm-input" 
                        value={client.name} 
                        readOnly 
                        style={{ background: '#F8FAFC', color: '#64748B' }}
                      />
                    </div>

                    <div className="crm-field-group">
                      <label>Correo Electrónico</label>
                      <div className="crm-input-icon-wrap">
                        <Mail size={16} className="crm-input-icon" />
                        <input 
                          type="email" 
                          className="crm-input has-icon" 
                          placeholder="contacto@cliente.com"
                          value={clientEmail}
                          onChange={e => setClientEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="crm-field-group">
                      <label>Teléfono / WhatsApp</label>
                      <div className="crm-input-icon-wrap">
                        <Phone size={16} className="crm-input-icon" />
                        <input 
                          type="tel" 
                          className="crm-input has-icon" 
                          placeholder="+34 600 000 000"
                          value={clientPhone}
                          onChange={e => setClientPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="crm-field-group">
                      <label>Carpeta de Google Drive (URL o ID)</label>
                      <div className="crm-input-icon-wrap">
                        <Folder size={16} className="crm-input-icon" />
                        <input 
                          type="text" 
                          className="crm-input has-icon" 
                          placeholder="https://drive.google.com/drive/folders/..."
                          value={clientDriveUrl}
                          onChange={e => setClientDriveUrl(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* State & Summary Card */}
                <div className="crm-card">
                  <div className="crm-card-header">
                    <ShieldAlert size={18} color="#27BEA5" />
                    <h3>Estado & Resumen Semáforo</h3>
                  </div>
                  <div className="crm-card-body">
                    <div className="crm-field-group">
                      <label>Etapa del Pipeline</label>
                      <select 
                        className="crm-select"
                        value={clientStage}
                        onChange={e => setClientStage(e.target.value)}
                      >
                        {CLIENT_STAGES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div className="crm-summary-box" style={{ background: semaforo.bg, borderColor: semaforo.badgeBorder }}>
                      <div className="crm-summary-pct" style={{ color: semaforo.color }}>
                        {semaforo.percentage}%
                      </div>
                      <div className="crm-summary-text">
                        <strong style={{ color: semaforo.color }}>Semáforo: {semaforo.statusLabel}</strong>
                        <p>{semaforo.completedCount} de {semaforo.totalCount} requerimientos cumplidos.</p>
                      </div>
                    </div>

                    <div className="crm-field-group" style={{ marginTop: '1.25rem' }}>
                      <label>Notas del Cliente</label>
                      <textarea
                        className="crm-textarea"
                        rows={4}
                        placeholder="Escribe notas sobre especificaciones del cliente, acuerdos o detalles operativos..."
                        value={clientNotes}
                        onChange={e => setClientNotes(e.target.value)}
                      />
                    </div>

                    {onDeleteClient && (
                      <div className="crm-field-group" style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #FEE2E2' }}>
                        <label style={{ color: '#DC2626' }}>Zona de Peligro</label>
                        <button
                          type="button"
                          className="crm-btn-danger"
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente al cliente "${client.name}" y todos sus requerimientos? Esta acción no se puede deshacer.`)) {
                              onDeleteClient(client.id);
                              onClose();
                            }
                          }}
                        >
                          <Trash2 size={15} /> Eliminar Cliente de Process
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: PROCESOS ACTIVOS */}
          {activeTab === 'active' && (
            <div className="crm-executions-view">
              {activeInstances.length === 0 ? (
                <div className="crm-empty-state-card">
                  <Rocket size={32} color="#94A3B8" />
                  <h3 className="crm-empty-title">No hay procesos activos</h3>
                  <p className="crm-empty-desc">
                    Actualmente no hay ninguna ejecución en curso asociada a este cliente.
                  </p>
                  {onLaunchForClient && (
                    <button 
                      type="button" 
                      className="crm-empty-btn-primary"
                      onClick={() => onLaunchForClient(client)}
                    >
                      <Rocket size={16} /> Lanzar Nuevo Proceso
                    </button>
                  )}
                </div>
              ) : (
                <div className="crm-executions-list">
                  {activeInstances.map(inst => {
                    const steps = inst.steps || [];
                    const completed = steps.filter(s => s.isCompleted).length;
                    const pct = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;

                    return (
                      <div key={inst.id} className="crm-execution-card">
                        <div className="crm-execution-main">
                          <h4 className="crm-execution-title">{inst.instanceName}</h4>
                          <span className="crm-execution-template">Plantilla: {inst.title}</span>
                          <div className="crm-execution-prog-bar-wrap">
                            <div className="crm-execution-prog-bar" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="crm-execution-prog-label">{completed} de {steps.length} pasos ({pct}%)</span>
                        </div>
                        <div className="crm-execution-action">
                          <button 
                            type="button" 
                            className="crm-btn-open-exec"
                            onClick={() => {
                              onClose();
                              if (onOpenInstance) onOpenInstance(inst.id);
                            }}
                          >
                            Abrir Proceso <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HISTORIAL COMPLETADO */}
          {activeTab === 'completed' && (
            <div className="crm-executions-view">
              {completedInstances.length === 0 ? (
                <div className="crm-empty-state-card">
                  <CheckCircle2 size={32} color="#94A3B8" />
                  <h3 className="crm-empty-title">Sin historial de procesos completados</h3>
                  <p className="crm-empty-desc">
                    Las ejecuciones que finalicen todos sus pasos aparecerán listadas aquí.
                  </p>
                </div>
              ) : (
                <div className="crm-executions-list">
                  {completedInstances.map(inst => {
                    return (
                      <div key={inst.id} className="crm-execution-card completed">
                        <div className="crm-execution-main">
                          <h4 className="crm-execution-title">{inst.instanceName}</h4>
                          <span className="crm-execution-template">Plantilla: {inst.title}</span>
                          <span className="crm-execution-badge-done">✅ Finalizado al 100%</span>
                        </div>
                        <div className="crm-execution-action">
                          <button 
                            type="button" 
                            className="crm-btn-open-exec"
                            onClick={() => {
                              onClose();
                              if (onOpenInstance) onOpenInstance(inst.id);
                            }}
                          >
                            Ver Detalles <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ═══════════════════════════════════════════════════════════════
            FOOTER: Save & Cancel
        ═══════════════════════════════════════════════════════════════ */}
        <div className="crm-modal-footer">
          <div className="crm-footer-status">
            <Info size={14} />
            <span>Guarda tus cambios para actualizar el semáforo y los datos del cliente.</span>
          </div>
          <div className="crm-footer-actions">
            <button type="button" className="crm-btn-cancel" onClick={onClose}>
              Cerrar
            </button>
            <button 
              type="button" 
              className="crm-btn-save" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SUB-MODAL: AGREGAR REQUERIMIENTO
      ═══════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="crm-submodal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="crm-submodal-card" onClick={e => e.stopPropagation()}>
            <div className="crm-submodal-header">
              <h3>Agregar Nuevo Requerimiento</h3>
              <button className="crm-submodal-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="crm-submodal-body">
              <div className="crm-field-group">
                <label>Nombre del Requerimiento *</label>
                <input 
                  type="text" 
                  className="crm-input" 
                  placeholder="ej. Reels de Instagram, Factura de Anticipo, Campaña de Ads..."
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="crm-field-group">
                <label>Tipo de Requerimiento</label>
                <div className="crm-type-selector-grid">
                  <div 
                    className={`crm-type-opt ${newItemType === 'counter' ? 'selected' : ''}`}
                    onClick={() => setNewItemType('counter')}
                  >
                    <Hash size={20} />
                    <strong>Contador con Meta</strong>
                    <span>Para contar entregables (ej. 6 Videos, 12 Posts)</span>
                  </div>

                  <div 
                    className={`crm-type-opt ${newItemType === 'boolean' ? 'selected' : ''}`}
                    onClick={() => setNewItemType('boolean')}
                  >
                    <CheckSquare size={20} />
                    <strong>Checkbox Simple</strong>
                    <span>Para verificar tareas (ej. Factura Paga, Brief Aprobado)</span>
                  </div>

                  <div 
                    className={`crm-type-opt ${newItemType === 'rating' ? 'selected' : ''}`}
                    onClick={() => setNewItemType('rating')}
                  >
                    <Star size={20} />
                    <strong>Calificación / Ads</strong>
                    <span>Excelente, Bueno, Regular o Malo (afecta semáforo)</span>
                  </div>
                </div>
              </div>

              {newItemType === 'counter' && (
                <div className="crm-field-group">
                  <label>Meta Numérica a Alcanzar *</label>
                  <input 
                    type="number" 
                    className="crm-input" 
                    min="1"
                    value={newItemTarget}
                    onChange={e => setNewItemTarget(e.target.value)}
                  />
                </div>
              )}

              {/* Gate / Execution Link */}
              <div className="crm-gate-section">
                <div className="crm-gate-section-title">
                  <Link2 size={14} /> Vinculación con Procesos y Bloqueos (Opcional)
                </div>

                <div className="crm-field-group" style={{ marginBottom: '0.75rem' }}>
                  <label>Vincular a un Proceso:</label>
                  <select 
                    className="crm-select"
                    value={newItemAssociatedInstanceId}
                    onChange={e => setNewItemAssociatedInstanceId(e.target.value)}
                  >
                    <option value="">Ninguno (Requerimiento general del cliente)</option>
                    {clientInstances.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.instanceName} ({inst.steps?.filter(s => s.isCompleted).length || 0}/{inst.steps?.length || 0} pasos)
                      </option>
                    ))}
                  </select>
                </div>

                <label className="crm-gate-toggle-row">
                  <input 
                    type="checkbox"
                    checked={newItemIsGate}
                    onChange={e => setNewItemIsGate(e.target.checked)}
                  />
                  <span>Activar como Punto de Bloqueo (Gate)</span>
                </label>

                {newItemIsGate && (
                  <div className="crm-gate-options-row">
                    <label className={`crm-gate-radio ${newItemGateType === 'blocks_execution' ? 'selected' : ''}`}>
                      <input 
                        type="radio" 
                        name="addGateType" 
                        value="blocks_execution"
                        checked={newItemGateType === 'blocks_execution'}
                        onChange={() => setNewItemGateType('blocks_execution')}
                      />
                      <div>
                        <strong>⛔ Bloquear Proceso</strong>
                        <span>El proceso no podrá avanzar hasta cumplir este requerimiento.</span>
                      </div>
                    </label>

                    <label className={`crm-gate-radio ${newItemGateType === 'blocked_by_execution' ? 'selected' : ''}`}>
                      <input 
                        type="radio" 
                        name="addGateType" 
                        value="blocked_by_execution"
                        checked={newItemGateType === 'blocked_by_execution'}
                        onChange={() => setNewItemGateType('blocked_by_execution')}
                      />
                      <div>
                        <strong>🔒 Bloquear Requerimiento</strong>
                        <span>Este ítem no podrá marcarse hasta que el proceso finalice al 100%.</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="crm-submodal-actions">
                <button type="button" className="crm-btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="crm-btn-save" disabled={!newItemName.trim()}>
                  Guardar Requerimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SUB-MODAL: EDITAR REQUERIMIENTO EXISTENTE
      ═══════════════════════════════════════════════════════════════ */}
      {editingItem && (
        <div className="crm-submodal-overlay" onClick={() => setEditingItem(null)}>
          <div className="crm-submodal-card" onClick={e => e.stopPropagation()}>
            <div className="crm-submodal-header">
              <h3>Editar Requerimiento</h3>
              <button className="crm-submodal-close" onClick={() => setEditingItem(null)}>
                <X size={18} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setEditingItem(null);
              }} 
              className="crm-submodal-body"
            >
              <div className="crm-field-group">
                <label>Nombre del Requerimiento</label>
                <input 
                  type="text" 
                  className="crm-input" 
                  value={editingItem.name || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingItem(prev => ({ ...prev, name: val }));
                    setItems(prev => prev.map(it => it.id === editingItem.id ? { ...it, name: val } : it));
                  }}
                />
              </div>

              {editingItem.type === 'counter' && (
                <div className="crm-field-group">
                  <label>Meta Numérica</label>
                  <input 
                    type="number" 
                    className="crm-input" 
                    min="1"
                    value={editingItem.target || 1}
                    onChange={e => {
                      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setEditingItem(prev => ({ ...prev, target: val }));
                      setItems(prev => prev.map(it => it.id === editingItem.id ? { 
                        ...it, 
                        target: val,
                        checked: (it.current || 0) >= val
                      } : it));
                    }}
                  />
                </div>
              )}

              {/* Gate / Execution Link */}
              <div className="crm-gate-section">
                <div className="crm-gate-section-title">
                  <Link2 size={14} /> Vinculación con Procesos y Bloqueos
                </div>

                <div className="crm-field-group" style={{ marginBottom: '0.75rem' }}>
                  <label>Vincular a un Proceso:</label>
                  <select 
                    className="crm-select"
                    value={editingItem.associatedInstanceId || ''}
                    onChange={e => {
                      const val = e.target.value || null;
                      setEditingItem(prev => ({ ...prev, associatedInstanceId: val }));
                      setItems(prev => prev.map(it => it.id === editingItem.id ? { ...it, associatedInstanceId: val } : it));
                    }}
                  >
                    <option value="">Ninguno (General)</option>
                    {clientInstances.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.instanceName}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="crm-gate-toggle-row">
                  <input 
                    type="checkbox"
                    checked={!!editingItem.isGate}
                    onChange={e => {
                      const val = e.target.checked;
                      setEditingItem(prev => ({ ...prev, isGate: val }));
                      setItems(prev => prev.map(it => it.id === editingItem.id ? { ...it, isGate: val } : it));
                    }}
                  />
                  <span>Activar como Punto de Bloqueo (Gate)</span>
                </label>

                {editingItem.isGate && (
                  <div className="crm-gate-options-row">
                    <label className={`crm-gate-radio ${editingItem.gateType !== 'blocked_by_execution' ? 'selected' : ''}`}>
                      <input 
                        type="radio" 
                        name="editGateType" 
                        value="blocks_execution"
                        checked={editingItem.gateType !== 'blocked_by_execution'}
                        onChange={() => {
                          setEditingItem(prev => ({ ...prev, gateType: 'blocks_execution' }));
                          setItems(prev => prev.map(it => it.id === editingItem.id ? { ...it, gateType: 'blocks_execution' } : it));
                        }}
                      />
                      <div>
                        <strong>⛔ Bloquear Proceso</strong>
                        <span>El proceso no podrá avanzar hasta cumplir este requerimiento.</span>
                      </div>
                    </label>

                    <label className={`crm-gate-radio ${editingItem.gateType === 'blocked_by_execution' ? 'selected' : ''}`}>
                      <input 
                        type="radio" 
                        name="editGateType" 
                        value="blocked_by_execution"
                        checked={editingItem.gateType === 'blocked_by_execution'}
                        onChange={() => {
                          setEditingItem(prev => ({ ...prev, gateType: 'blocked_by_execution' }));
                          setItems(prev => prev.map(it => it.id === editingItem.id ? { ...it, gateType: 'blocked_by_execution' } : it));
                        }}
                      />
                      <div>
                        <strong>🔒 Bloquear Requerimiento</strong>
                        <span>Este ítem no podrá marcarse hasta que el proceso finalice al 100%.</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="crm-submodal-actions">
                <button type="button" className="crm-btn-cancel" onClick={() => setEditingItem(null)}>
                  Cerrar
                </button>
                <button type="submit" className="crm-btn-save">
                  Listo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
