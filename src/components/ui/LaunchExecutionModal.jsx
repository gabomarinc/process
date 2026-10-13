import React, { useState, useEffect, useMemo } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Rocket, X } from "lucide-react";
import { cn } from "../../lib/utils";
import "./LaunchExecutionModal.css";

export const LaunchExecutionModal = ({
  templates,
  teamMembers,
  clients = [],
  initialTemplateId,
  onSchedule,
  onCancel,
}) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [startDate, setStartDate] = useState(new Date());
  
  const [launchInstanceName, setLaunchInstanceName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || "");
  const [clientMode, setClientMode] = useState("existing");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientNameInput, setClientNameInput] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }), // Week starts on Monday
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Determine involved members based on the selected template
  const involvedMembers = useMemo(() => {
    if (!selectedTemplateId) return [];
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return [];

    const assignedIds = new Set();
    template.steps.forEach(step => {
      if (step.assignedTo) {
        if (Array.isArray(step.assignedTo)) {
          step.assignedTo.forEach(id => assignedIds.add(String(id)));
        } else {
          assignedIds.add(String(step.assignedTo));
        }
      }
    });

    const members = [];
    assignedIds.forEach(id => {
      const m = teamMembers.find(member => String(member.id) === id);
      if (m) members.push(m);
    });

    return members;
  }, [selectedTemplateId, templates, teamMembers]);

  const handleSchedule = (e) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      alert("Por favor selecciona una plantilla.");
      return;
    }
    const finalClient = (clientNameInput || clientSearchQuery || launchInstanceName).trim();
    if (!finalClient) {
      alert("Por favor indica el cliente de la ejecución.");
      return;
    }
    const finalInstanceName = (launchInstanceName || finalClient).trim();
    if (!finalInstanceName) {
      alert("Por favor introduce el nombre de la ejecución.");
      return;
    }
    onSchedule({
      templateId: selectedTemplateId,
      instanceName: finalInstanceName,
      clientName: finalClient,
      clientId: selectedClientId || null,
      startDate: startDate,
      isNewClient: clientMode === 'new' || !selectedClientId
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onCancel}>
      <motion.div
        className="launch-scheduler-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 20 }}>
          <button className="close-btn-aesthetic" onClick={onCancel} title="Cerrar"><X size={20} /></button>
        </div>

        <div className="launch-header">
          <div className="launch-icon-box">
            <Rocket size={20} />
          </div>
          <div>
            <h3 className="launch-title">Iniciar Nueva Ejecución</h3>
            <p className="launch-desc">Configura los parámetros para desplegar este proceso.</p>
          </div>
        </div>
        
        <div className="launch-content">
          {/* Left Side: Calendar */}
          <div>
            <div className="calendar-header">
              <button type="button" onClick={prevMonth} className="close-btn-aesthetic" style={{ width: '32px', height: '32px' }}>
                <ChevronLeft size={16} />
              </button>
              <AnimatePresence mode="wait">
                <motion.div
                  key={format(currentMonth, "MMMM yyyy")}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="calendar-month capitalize"
                >
                  {format(currentMonth, "MMMM yyyy")}
                </motion.div>
              </AnimatePresence>
              <button type="button" onClick={nextMonth} className="close-btn-aesthetic" style={{ width: '32px', height: '32px' }}>
                <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="calendar-grid-header">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            
            <div className="calendar-grid">
              {days.map((day) => {
                const isSelected = startDate && isSameDay(day, startDate);
                const isMuted = !isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toString()}
                    type="button"
                    onClick={() => setStartDate(day)}
                    className={cn(
                      "calendar-day",
                      isMuted ? "muted" : "",
                      isToday ? "today" : "",
                      isSelected ? "selected" : ""
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Right Side: Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="form-group">
              <label className="custom-wizard-label">Plantilla a ejecutar *</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="custom-wizard-input"
              >
                <option value="">-- Seleccionar Plantilla --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            {/* Dedicated Client Field */}
            <div className="form-group">
              <label className="custom-wizard-label">Cliente Asociado *</label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div 
                  onClick={() => { setClientMode('existing'); setSelectedClientId(''); setClientNameInput(''); setClientSearchQuery(''); }}
                  style={{
                    padding: '8px 10px',
                    border: '1px solid',
                    borderColor: clientMode === 'existing' ? 'var(--color-primary)' : '#d1d5db',
                    backgroundColor: clientMode === 'existing' ? 'rgba(39, 190, 167, 0.05)' : 'white',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: clientMode === 'existing' ? 'var(--color-primary)' : 'var(--text-main)' }}>Cliente Existente</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>Seleccionar del registro</div>
                </div>
                
                <div 
                  onClick={() => { setClientMode('new'); setSelectedClientId(''); setClientNameInput(''); setClientSearchQuery(''); }}
                  style={{
                    padding: '8px 10px',
                    border: '1px solid',
                    borderColor: clientMode === 'new' ? 'var(--color-primary)' : '#d1d5db',
                    backgroundColor: clientMode === 'new' ? 'rgba(39, 190, 167, 0.05)' : 'white',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: clientMode === 'new' ? 'var(--color-primary)' : 'var(--text-main)' }}>+ Cliente Nuevo</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>Se creará automáticamente</div>
                </div>
              </div>

              {clientMode === 'new' ? (
                <input
                  type="text"
                  placeholder="Nombre de la empresa o cliente (ej. Acme Corp)"
                  value={clientNameInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientNameInput(val);
                    if (!launchInstanceName || launchInstanceName === clientNameInput) {
                      setLaunchInstanceName(val);
                    }
                  }}
                  className="custom-wizard-input"
                  required
                />
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Buscar o escribir nombre de cliente..."
                    value={clientSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientSearchQuery(val);
                      setClientNameInput(val);
                      setSelectedClientId('');
                      if (!launchInstanceName || launchInstanceName === clientSearchQuery) {
                        setLaunchInstanceName(val);
                      }
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                    className="custom-wizard-input"
                    required
                  />
                  {showClientDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      zIndex: 50,
                      maxHeight: '160px',
                      overflowY: 'auto',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}>
                      {clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())).length > 0 ? (
                        clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())).map(c => (
                          <div 
                            key={c.id} 
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              fontSize: '0.85rem'
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setClientSearchQuery(c.name);
                              setClientNameInput(c.name);
                              setSelectedClientId(c.id);
                              if (!launchInstanceName || launchInstanceName === clientSearchQuery) {
                                setLaunchInstanceName(c.name);
                              }
                              setShowClientDropdown(false);
                            }}
                            className="hover-bg-accent"
                          >
                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                            {c.email && <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '6px' }}>({c.email})</span>}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '8px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          No existe aún. Si continúas, se creará automáticamente como cliente nuevo.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dedicated Execution Name Field */}
            <div className="form-group">
              <label className="custom-wizard-label">Nombre de la Ejecución / Proceso *</label>
              <input
                type="text"
                placeholder="Ej. Acme Corp - Onboarding Abril"
                value={launchInstanceName}
                onChange={(e) => setLaunchInstanceName(e.target.value)}
                className="custom-wizard-input"
                required
              />
              <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px', display: 'block' }}>
                Identificador de la tarjeta en el Kanban (por defecto el nombre del cliente).
              </span>
            </div>

            <div className="form-group">
              <label className="custom-wizard-label">Fecha de Inicio Elegida</label>
              <div style={{
                background: 'rgba(39, 190, 167, 0.05)',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid rgba(39, 190, 167, 0.15)',
                fontSize: '0.85rem',
                color: 'var(--color-primary)',
                fontWeight: 600
              }}>
                {startDate ? format(startDate, "dd 'de' MMMM, yyyy") : "Selecciona una fecha en el calendario"}
              </div>
            </div>

            {selectedTemplateId && (
              <div className="form-group">
                <label className="custom-wizard-label" style={{ color: 'var(--text-muted)' }}>
                  Miembros Involucrados ({involvedMembers.length})
                </label>
                {involvedMembers.length > 0 ? (
                  <div className="involved-members">
                    {involvedMembers.map(m => (
                      <div key={m.id} className="involved-member-chip">
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} />
                        ) : (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            fontWeight: 'bold'
                          }}>
                            {m.name.charAt(0)}
                          </div>
                        )}
                        <span>{m.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Nadie asignado por defecto en esta plantilla.
                  </p>
                )}
              </div>
            )}
            
          </div>
        </div>

        <div className="launch-footer">
          <button type="button" onClick={onCancel} className="custom-wizard-btn-back">Cancelar</button>
          <button
            type="button"
            onClick={handleSchedule}
            disabled={!startDate || !selectedTemplateId || !launchInstanceName.trim()}
            className="custom-wizard-btn-next"
            style={{
              opacity: (!startDate || !selectedTemplateId || !launchInstanceName.trim()) ? 0.5 : 1,
              cursor: (!startDate || !selectedTemplateId || !launchInstanceName.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            Lanzar Ejecución
          </button>
        </div>
      </motion.div>
    </div>
  );
};
