import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, AlertCircle, Upload, FileCheck } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '../../lib/utils';

export const ActiveExecutionModal = ({
  isOpen,
  onClose,
  activeInstance,
  teamMembers,
  checkOverdueSteps,
  handleStepComplete,
  handleAssignStepMember,
}) => {
  const [showAllSteps, setShowAllSteps] = useState(false);

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

  let activeIndex = activeInstance.steps.findIndex((s, idx) => !s.isCompleted && stepsActive[idx]);
  if (activeIndex === -1) {
    const allDone = activeInstance.steps.every(s => s.isCompleted);
    activeIndex = allDone ? totalSteps : 0;
  }

  const highlighted = [];
  
  if (activeIndex > 0 && activeInstance.steps[activeIndex - 1]) {
    highlighted.push({ step: activeInstance.steps[activeIndex - 1], index: activeIndex - 1, status: 'completed' });
  }
  if (activeIndex < totalSteps && activeInstance.steps[activeIndex]) {
    highlighted.push({ step: activeInstance.steps[activeIndex], index: activeIndex, status: 'active' });
  }
  if (activeIndex + 1 < totalSteps && activeInstance.steps[activeIndex + 1]) {
    highlighted.push({ step: activeInstance.steps[activeIndex + 1], index: activeIndex + 1, status: 'upcoming' });
  }

  const involvedAssignees = Array.from(new Set(activeInstance.steps.filter(s => s.assignedTo).map(s => s.assignedTo)));

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <motion.div
        className="w-full max-w-4xl mx-auto py-8 px-4"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <Card className="border shadow-md rounded-3xl overflow-hidden flex flex-col" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', maxHeight: '85vh' }}>
          
          {/* Header */}
          <div className="sticky top-0 right-0 flex justify-between items-center p-4 bg-background/90 backdrop-blur z-10 border-b">
            <span className="font-semibold text-foreground">Detalles de la Ejecución</span>
            <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
          </div>

          <div className="p-8 overflow-y-auto flex-1">
            <div className="achievement-card-unified">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold font-serif text-foreground mb-1">
                    {activeInstance.instanceName}
                  </h2>
                  <div className="text-lg text-primary font-bold mb-2">
                    {activeInstance.category}
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Plantilla base: {activeInstance.title} • Iniciado el {new Date(activeInstance.startedAt).toLocaleDateString()}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-muted-foreground">Involucrados:</span>
                    <div className="flex">
                      {involvedAssignees.map((assigneeId, i) => {
                        const member = teamMembers.find(m => String(m.id) === String(assigneeId));
                        if (!member) return null;
                        const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        return (
                          <div key={assigneeId} title={member.name} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold border-2 border-background" style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: 10 - i }}>
                            {initials}
                          </div>
                        );
                      })}
                      {involvedAssignees.length === 0 && (
                        <span className="text-xs text-muted-foreground ml-1">Ninguno asignado aún</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {checkOverdueSteps(activeInstance) && (
                    <span className="flex items-center gap-1.5 text-xs font-bold bg-destructive/10 text-destructive px-3 py-1.5 rounded-full border border-destructive/20">
                      <AlertCircle size={14} /> Con Atraso
                    </span>
                  )}
                </div>
              </div>

              {/* Big Counter */}
              <div className="text-center my-10">
                <p className="text-[4.5rem] font-extrabold text-foreground leading-none m-0 flex items-baseline justify-center gap-2">
                  {completedSteps} <span className="text-3xl text-muted-foreground font-medium">/ {totalSteps}</span>
                </p>
                <p className="text-sm text-muted-foreground font-bold mt-2 uppercase tracking-wider">
                  Pasos Completados en este Flujo
                </p>
              </div>

              {/* Highlighted Steps Trio */}
              <div className="achievement-trio-display">
                {highlighted.map((item, index) => {
                  const step = item.step;
                  const isOverdue = !step.isCompleted && new Date() > new Date(step.dueDate);
                  const alignmentClass = highlighted.length === 3 
                    ? (index === 1 ? "trio-active" : "trio-side") 
                    : (item.status === 'active' ? "trio-active" : "trio-side");

                  return (
                    <div key={step.id} className={`trio-card ${alignmentClass} ${item.status}`}>
                      <div className="trio-card-header">
                        <span className="trio-badge-number">Paso {item.index + 1}</span>
                        {item.status === 'completed' && <Check size={16} className="text-success-icon" />}
                        {item.status === 'active' && <Clock size={16} className="text-active-icon animate-pulse" />}
                        {item.status === 'upcoming' && <AlertCircle size={16} className="text-muted-icon" />}
                      </div>

                      <h4 className="trio-card-title">{step.title}</h4>
                      
                      {item.status === 'active' && (
                        <>
                          <span className="trio-card-date">Límite: {new Date(step.dueDate).toLocaleDateString()}</span>
                          <p className="trio-card-desc">{step.description}</p>
                          
                          {isOverdue && (
                            <div className="overdue-banner">
                              <AlertCircle size={14} />
                              <span>Límite vencido el {new Date(step.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}

                          <div className="trio-card-action">
                            {step.type === 'manual' ? (
                              <label className="emotional-checkbox-label">
                                <input 
                                  type="checkbox"
                                  checked={step.isCompleted}
                                  disabled={step.isCompleted}
                                  onChange={(e) => handleStepComplete(activeInstance.id, step.id, e.target.checked)}
                                />
                                <div className="checkbox-visual">
                                  {step.isCompleted && <Check size={16} />}
                                </div>
                                <span>Marcar como hecho</span>
                              </label>
                            ) : (
                              <div className="w-full">
                                {step.isCompleted ? (
                                  <div className="uploaded-badge">
                                    <FileCheck size={14} />
                                    <span>{step.uploadedFileName || 'Cargado'}</span>
                                  </div>
                                ) : (
                                  <label className="step-file-upload block m-0 p-1.5 cursor-pointer hover:bg-accent rounded-lg border border-dashed transition-colors">
                                    <input 
                                      type="file" 
                                      style={{ display: 'none' }}
                                      accept={step.acceptedFormats?.join(',')}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleStepComplete(activeInstance.id, step.id, true, file.name);
                                        }
                                      }}
                                    />
                                    <div className="flex items-center justify-center gap-2">
                                      <Upload size={14} className="text-primary" />
                                      <span className="text-xs font-semibold">
                                        Subir archivo ({step.acceptedFormats?.join(', ')})
                                      </span>
                                    </div>
                                  </label>
                                )}
                              </div>
                            )}
                          </div>

                          {step.motivation && (
                            <div className="step-motivation text-xs mt-2">
                              💡 {step.motivation}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs bg-accent px-2 py-1 rounded-full mt-2 w-fit">
                            <select
                              value={step.assignedTo ? String(step.assignedTo) : ''}
                              onChange={(e) => handleAssignStepMember(activeInstance.id, step.id, e.target.value)}
                              className="border-none bg-transparent outline-none text-xs cursor-pointer p-0"
                            >
                              <option value="">Sin Asignar</option>
                              {teamMembers.map(m => (
                                <option key={m.id} value={String(m.id)}>{m.name}</option>
                              ))}
                            </select>
                            {step.assignedTo && teamMembers.find(m => String(m.id) === String(step.assignedTo)) && (
                              <div className="w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold">
                                {teamMembers.find(m => String(m.id) === String(step.assignedTo)).name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {item.status !== 'active' && (
                        <p className="trio-card-desc-compact">{step.description}</p>
                      )}
                      
                      {item.status === 'upcoming' && (
                        <span className="trio-card-date">Límite estimado: {new Date(step.dueDate).toLocaleDateString()}</span>
                      )}
                      {item.status === 'completed' && (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 inline-block">Completado</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* All Steps Section */}
              <div className="achievement-steps-list-section">
                <div 
                  className="flex justify-between items-center cursor-pointer border-t pt-5 mt-6 hover:bg-accent/50 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => setShowAllSteps(!showAllSteps)}
                >
                  <h3 className="text-primary text-sm font-semibold m-0">
                    Todos los Pasos del Proceso ({totalSteps})
                  </h3>
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-full">
                    {showAllSteps ? 'Ocultar Detalles' : 'Ver Todos'}
                  </Button>
                </div>

                <AnimatePresence>
                  {showAllSteps && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-5 space-y-4"
                    >
                      {activeInstance.steps.map((step, idx) => {
                        const isActive = !step.isCompleted && stepsActive[idx];
                        const isLocked = !step.isCompleted && !stepsActive[idx];
                        const isOverdue = !step.isCompleted && new Date() > new Date(step.dueDate);

                        return (
                          <div 
                            key={step.id} 
                            className={cn(
                              "step-row flex gap-4 transition-opacity",
                              step.isCompleted ? 'completed' : '',
                              isActive ? 'active' : '',
                              isLocked ? 'locked opacity-65 grayscale-[0.2]' : ''
                            )}
                          >
                            <div className="step-indicator shrink-0">
                              {step.isCompleted ? <Check size={20} /> : idx + 1}
                            </div>

                            <Card className="step-card flex-1 shadow-sm border-muted">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-semibold text-foreground m-0">{step.title}</h4>
                                    <span className="text-xs text-primary font-bold block mt-0.5">
                                      {step.durationLabel} (Límite: {new Date(step.dueDate).toLocaleDateString()})
                                    </span>
                                  </div>
                                  <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                    step.type === 'digital' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                                  )}>
                                    {step.type === 'digital' ? 'Acción Digital' : 'Paso Manual'}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{step.description}</p>

                                {isOverdue && (
                                  <div className="overdue-banner mt-2">
                                    <AlertCircle size={16} />
                                    <span>Límite vencido el {new Date(step.dueDate).toLocaleDateString()}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5 text-xs bg-accent px-3 py-1 rounded-full mt-3 mb-3 w-fit border">
                                  <select
                                    value={step.assignedTo ? String(step.assignedTo) : ''}
                                    onChange={(e) => handleAssignStepMember(activeInstance.id, step.id, e.target.value)}
                                    className="border-none bg-transparent outline-none text-xs cursor-pointer p-0"
                                  >
                                    <option value="">Sin Asignar</option>
                                    {teamMembers.map(m => (
                                      <option key={m.id} value={String(m.id)}>{m.name}</option>
                                    ))}
                                  </select>
                                  {step.assignedTo && teamMembers.find(m => String(m.id) === String(step.assignedTo)) && (
                                    <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold">
                                      {teamMembers.find(m => String(m.id) === String(step.assignedTo)).name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                {!isLocked && (
                                  <div className="step-action-area pt-2 border-t border-dashed">
                                    {step.type === 'manual' ? (
                                      <label className="emotional-checkbox-label cursor-pointer flex items-center gap-2">
                                        <input 
                                          type="checkbox"
                                          checked={step.isCompleted}
                                          disabled={step.isCompleted}
                                          onChange={(e) => handleStepComplete(activeInstance.id, step.id, e.target.checked)}
                                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                                        />
                                        <span className={cn("text-sm font-medium", step.isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
                                          {step.isCompleted ? 'Logrado' : 'Marcar como hecho'}
                                        </span>
                                      </label>
                                    ) : (
                                      <div>
                                        {step.isCompleted ? (
                                          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                            <FileCheck size={16} />
                                            <span>{step.uploadedFileName || 'Archivo cargado'}</span>
                                          </div>
                                        ) : (
                                          <label className="cursor-pointer flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-dashed border-primary/30 transition-colors">
                                            <input 
                                              type="file" 
                                              style={{ display: 'none' }}
                                              accept={step.acceptedFormats?.join(',')}
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  handleStepComplete(activeInstance.id, step.id, true, file.name);
                                                }
                                              }}
                                            />
                                            <Upload size={16} />
                                            <span>Subir archivo ({step.acceptedFormats?.join(', ')})</span>
                                          </label>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
