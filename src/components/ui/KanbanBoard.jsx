import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Clock 
} from 'lucide-react';
import './KanbanBoard.css';

export const KanbanBoard = ({ 
  instances = [], 
  kanbanColumns = ["Por hacer", "En curso", "Terminado"], 
  onUpdateInstanceStatus, 
  onAddColumn, 
  onRenameColumn, 
  onDeleteColumn,
  onOpenInstanceModal,
  teamMembers = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [editingColumnIdx, setEditingColumnIdx] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [draggedOverCol, setDraggedOverCol] = useState(null);

  // Helper to determine text colors/indicators based on column index
  const getColColor = (index) => {
    const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6366f1'];
    return colors[index % colors.length];
  };

  // Filter instances by search query
  const filteredInstances = instances.filter(inst => {
    const query = searchQuery.toLowerCase();
    return (inst.instanceName?.toLowerCase().includes(query) || 
            inst.title?.toLowerCase().includes(query) || 
            inst.category?.toLowerCase().includes(query));
  });

  // Calculate stats for a card
  const getCardStats = (inst) => {
    const steps = inst.steps || [];
    const total = steps.length;
    const completed = steps.filter(s => s.isCompleted).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Check if any step is overdue
    let isOverdue = false;
    let dueLabel = '';
    let dateStatusClass = '';

    // Calculate overall project target date based on last step
    if (steps.length > 0) {
      const dates = steps.map(s => new Date(s.dueDate).getTime());
      const maxDate = new Date(Math.max(...dates));
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const targetDay = new Date(maxDate);
      targetDay.setHours(0,0,0,0);

      const diffTime = targetDay.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      dueLabel = maxDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      
      if (diffDays < 0 && completed < total) {
        isOverdue = true;
        dateStatusClass = 'overdue';
      } else if (diffDays === 0 && completed < total) {
        dateStatusClass = 'due-today';
      }
    }

    return { total, completed, pct, isOverdue, dueLabel, dateStatusClass };
  };

  // Get user avatars assigned to steps in this instance
  const getInstanceMembers = (inst) => {
    const memberEmails = new Set();
    const memberIds = new Set();
    
    (inst.steps || []).forEach(step => {
      if (step.assignedTo && step.assignedTo !== 'Unassigned') {
        if (step.assignedTo.includes('@')) {
          memberEmails.add(step.assignedTo);
        } else {
          memberIds.add(step.assignedTo);
        }
      }
    });

    return teamMembers.filter(m => 
      memberIds.has(String(m.id)) || 
      memberEmails.has(m.email)
    );
  };

  // Drag and Drop handlers
  const handleDragStart = (e, instanceId) => {
    e.dataTransfer.setData('text/plain', instanceId);
  };

  const handleDragOver = (e, colName) => {
    e.preventDefault();
    if (draggedOverCol !== colName) {
      setDraggedOverCol(colName);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverCol(null);
  };

  const handleDrop = (e, targetColumnName) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const instanceId = e.dataTransfer.getData('text/plain');
    if (!instanceId) return;
    
    // Find current instance status
    const inst = instances.find(i => i.id === instanceId);
    if (inst && inst.status !== targetColumnName) {
      onUpdateInstanceStatus(instanceId, targetColumnName);
    }
  };

  const handleCreateColumnSubmit = (e) => {
    e.preventDefault();
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim());
      setNewColumnName('');
      setIsAddingColumn(false);
    }
  };

  const handleStartEditingCol = (index, currentName) => {
    setEditingColumnIdx(index);
    setEditingColumnName(currentName);
  };

  const handleSaveColumnRename = (index) => {
    if (editingColumnName.trim()) {
      onRenameColumn(index, editingColumnName.trim());
      setEditingColumnIdx(null);
    }
  };

  const handleDeleteColumnSubmit = (colName, index) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la columna "${colName}"?`)) {
      onDeleteColumn(index, colName);
    }
  };

  return (
    <div className="kanban-board-container">
      {/* Header Panel */}
      <div className="kanban-board-header">
        <div className="kanban-header-left">
          <div>
            <h2 className="kanban-board-title">Tablero de Control</h2>
            <div className="kanban-board-subtitle">Gestiona tus procesos activos con drag & drop.</div>
          </div>
        </div>

        <div className="kanban-board-actions">
          <input 
            type="text" 
            placeholder="Buscar ejecuciones..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="kanban-search-input"
          />
          {!isAddingColumn && (
            <button 
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={() => setIsAddingColumn(true)}
            >
              <Plus size={16} /> Nueva Estado
            </button>
          )}
        </div>
      </div>

      {/* Adding column inline form */}
      {isAddingColumn && (
        <div style={{ maxWidth: '300px', marginBottom: '1.5rem' }}>
          <form onSubmit={handleCreateColumnSubmit} className="kanban-column-input-wrapper">
            <input 
              type="text"
              placeholder="Nombre del nuevo estado..."
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="kanban-column-input"
              autoFocus
            />
            <div className="kanban-column-input-actions">
              <button type="button" className="kanban-btn-tiny secondary" onClick={() => setIsAddingColumn(false)}>Cancelar</button>
              <button type="submit" className="kanban-btn-tiny primary">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Columns Scroll Box */}
      <div className="kanban-columns-scrollable">
        {kanbanColumns.map((colName, colIdx) => {
          // Get cards for this column
          const cards = filteredInstances.filter(inst => {
            const status = inst.status || 'Por hacer';
            return status.toLowerCase() === colName.toLowerCase();
          });

          const isEditing = editingColumnIdx === colIdx;
          const isOver = draggedOverCol === colName;

          return (
            <div 
              key={colIdx} 
              className={`kanban-column ${isOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, colName)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, colName)}
            >
              {/* Column Header */}
              <div className="kanban-column-header">
                <div className="kanban-column-header-left" style={{ flex: 1, minWidth: 0 }}>
                  <div className="kanban-column-dot" style={{ backgroundColor: getColColor(colIdx) }} />
                  {isEditing ? (
                    <input 
                      type="text"
                      value={editingColumnName}
                      onChange={(e) => setEditingColumnName(e.target.value)}
                      onBlur={() => handleSaveColumnRename(colIdx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveColumnRename(colIdx);
                        if (e.key === 'Escape') setEditingColumnIdx(null);
                      }}
                      className="kanban-column-input"
                      style={{ margin: 0, padding: '2px 6px', fontSize: '0.9rem', fontWeight: 600 }}
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="kanban-column-name text-ellipsis" 
                      title={colName}
                      onDoubleClick={() => handleStartEditingCol(colIdx, colName)}
                    >
                      {colName}
                    </span>
                  )}
                  <span className="kanban-column-count">{cards.length}</span>
                </div>

                <div className="kanban-column-actions">
                  <button 
                    className="kanban-column-btn" 
                    onClick={() => handleStartEditingCol(colIdx, colName)}
                    title="Renombrar Estado"
                  >
                    <Edit size={12} />
                  </button>
                  {kanbanColumns.length > 1 && (
                    <button 
                      className="kanban-column-btn" 
                      onClick={() => handleDeleteColumnSubmit(colName, colIdx)}
                      title="Eliminar Estado"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Cards List */}
              <div className="kanban-cards-list">
                {cards.map(inst => {
                  const stats = getCardStats(inst);
                  const assignedMembers = getInstanceMembers(inst);

                  return (
                    <div 
                      key={inst.id}
                      className="kanban-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, inst.id)}
                      onClick={() => onOpenInstanceModal(inst.id)}
                    >
                      <div className="kanban-card-category">{inst.category || 'General'}</div>
                      <h4 className="kanban-card-title text-ellipsis-2">{inst.instanceName}</h4>
                      <div className="kanban-card-subtitle text-ellipsis">{inst.title}</div>
                      
                      {/* Progress Section */}
                      <div className="kanban-card-progress-section">
                        <div className="kanban-card-progress-text">
                          <span>Pasos</span>
                          <span>{stats.completed}/{stats.total} ({stats.pct}%)</span>
                        </div>
                        <div className="kanban-card-progress-bar-bg">
                          <div 
                            className="kanban-card-progress-bar-fill" 
                            style={{ 
                              width: `${stats.pct}%`,
                              backgroundColor: stats.pct === 100 ? '#10b981' : 'var(--color-primary)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="kanban-card-footer">
                        <div className={`kanban-card-date ${stats.dateStatusClass}`}>
                          <Calendar size={12} />
                          <span>{stats.dueLabel || 'Sin fecha'}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Companion Icon */}
                          <div className="kanban-card-companion-circle" title={`Guía: ${inst.companionName}`}>
                            {inst.companionAvatar || '✨'}
                          </div>

                          {/* Member Avatars */}
                          {assignedMembers.length > 0 && (
                            <div className="kanban-card-members">
                              {assignedMembers.slice(0, 3).map((m, idx) => (
                                <div 
                                  key={idx} 
                                  className="kanban-member-avatar-mini" 
                                  title={`${m.name} (${m.role})`}
                                  style={{ backgroundColor: getColColor(m.name.length) }}
                                >
                                  {m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                              ))}
                              {assignedMembers.length > 3 && (
                                <div className="kanban-member-avatar-mini" style={{ background: '#ddd', color: '#666' }}>
                                  +{assignedMembers.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '80px', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                    Arrastra aquí
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state Column clicker */}
        {!isAddingColumn && (
          <div className="kanban-add-column-button" onClick={() => setIsAddingColumn(true)}>
            <Plus size={18} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Añadir Estado</span>
          </div>
        )}
      </div>
    </div>
  );
};
