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
import { ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import "./LaunchExecutionModal.css";

export const LaunchExecutionModal = ({
  templates,
  teamMembers,
  initialTemplateId,
  onSchedule,
  onCancel,
}) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [startDate, setStartDate] = useState(new Date());
  
  const [launchInstanceName, setLaunchInstanceName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || "");

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
        assignedIds.add(String(step.assignedTo));
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
    if (!launchInstanceName.trim()) {
      alert("Por favor introduce el nombre de la ejecución.");
      return;
    }
    onSchedule({
      templateId: selectedTemplateId,
      instanceName: launchInstanceName,
      startDate: startDate,
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <motion.div 
        className="launch-scheduler-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <div className="launch-header">
          <div className="launch-icon-box">
            <Rocket size={24} />
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
              <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={prevMonth} aria-label="Mes anterior">
                <ChevronLeft size={20} />
              </button>
              <AnimatePresence mode="wait">
                <motion.div
                  key={format(currentMonth, "MMMM yyyy")}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="calendar-month"
                >
                  {format(currentMonth, "MMMM yyyy")}
                </motion.div>
              </AnimatePresence>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={nextMonth} aria-label="Mes siguiente">
                <ChevronRight size={20} />
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
                  <motion.button
                    type="button"
                    key={day.toString()}
                    onClick={() => setStartDate(day)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`calendar-day ${isMuted ? 'muted' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  >
                    {format(day, "d")}
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          {/* Right Side: Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Plantilla a ejecutar *</label>
              <select 
                className="form-input" 
                value={selectedTemplateId} 
                onChange={e => setSelectedTemplateId(e.target.value)}
                required
              >
                <option value="">-- Seleccionar Plantilla --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Nombre de la Ejecución *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Onboarding Ana Pérez"
                value={launchInstanceName}
                onChange={(e) => setLaunchInstanceName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Fecha de Inicio Elegida</label>
              <div style={{ background: 'var(--bg-light)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                {startDate ? format(startDate, "dd 'de' MMMM, yyyy") : "Selecciona una fecha en el calendario"}
              </div>
            </div>

            {selectedTemplateId && (
              <div className="form-group" style={{ marginTop: 'auto' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Miembros Involucrados ({involvedMembers.length})
                </label>
                {involvedMembers.length > 0 ? (
                  <div className="involved-members">
                    {involvedMembers.map(m => (
                      <div key={m.id} className="involved-member-chip">
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} />
                        ) : (
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>
                            {m.name.charAt(0)}
                          </div>
                        )}
                        <span>{m.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Nadie asignado por defecto en esta plantilla.
                  </p>
                )}
              </div>
            )}
            
            <div className="launch-footer">
              <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleSchedule} disabled={!startDate || !selectedTemplateId || !launchInstanceName.trim()}>
                Lanzar Ejecución
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
