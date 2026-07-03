import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '../../lib/utils';

export const MemberModal = ({
  isOpen,
  onClose,
  step,
  setStep,
  editingMember,
  formData,
  setFormData,
  handleSave,
  teamMembers,
  orgUsers,
  templates,
  expandedTeamTemplates,
  setExpandedTeamTemplates,
  modifiedTemplateIds,
  setTemplates,
  showAlert
}) => {
  if (!isOpen) return null;

  const handleNextStep = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name || !formData.email) {
        showAlert("Por favor completa los campos obligatorios del Paso 1.");
        return;
      }
    } else if (step === 2) {
      if (!formData.role || !formData.department) {
        showAlert("Por favor completa los campos obligatorios del Paso 2.");
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <motion.div
        className="w-full max-w-lg mx-auto py-8 px-4"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
        </div>

        <Card className="border shadow-md rounded-3xl overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{editingMember ? '📝 Editar Colaborador' : '👥 Nuevo Colaborador'}</CardTitle>
                <div className="inline-flex mt-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  Paso {step} de 3
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Stepper Progress Bar */}
            <div className="flex gap-2 mb-6">
              <div className="flex-1 h-1.5 rounded-full bg-primary" />
              <div className={cn("flex-1 h-1.5 rounded-full", step >= 2 ? "bg-primary" : "bg-muted")} />
              <div className={cn("flex-1 h-1.5 rounded-full", step >= 3 ? "bg-primary" : "bg-muted")} />
            </div>

            <form onSubmit={step < 3 ? handleNextStep : handleSave} className="space-y-6">
              
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre Completo <span className="text-destructive">*</span></Label>
                      <Input 
                        type="text" 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        required 
                        autoFocus
                        className="focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Correo Electrónico <span className="text-destructive">*</span></Label>
                      <Input 
                        type="email" 
                        value={formData.email} 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                        required 
                        className="focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Cargo / Rol <span className="text-destructive">*</span></Label>
                      <Input 
                        type="text" 
                        placeholder="Ej. Diseñadora de UI, Director de Operaciones" 
                        value={formData.role} 
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })} 
                        required 
                        autoFocus
                        className="focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Departamento / Área <span className="text-destructive">*</span></Label>
                      <Input 
                        type="text" 
                        placeholder="Ej. Operaciones, Tecnología, Finanzas"
                        value={formData.department || ''} 
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                        required 
                        className="focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Jefe Directo (Opcional)</Label>
                      <Select 
                        value={formData.managerId || "none"} 
                        onValueChange={(val) => setFormData({ ...formData, managerId: val === "none" ? "" : val })}
                      >
                        <SelectTrigger className="focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder="-- Sin jefe directo --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Sin jefe directo --</SelectItem>
                          {teamMembers
                            .filter(m => !editingMember || m.id !== editingMember.id)
                            .map(m => (
                              <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.role})</SelectItem>
                            ))
                          }
                          {orgUsers
                            .filter(u => !teamMembers.some(m => m.email === u.email))
                            .map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'Administrador' : 'Agente'})</SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Asignación de Pasos en Procesos</Label>
                      <p className="text-xs text-muted-foreground mb-4">
                        Activa o desactiva los pasos específicos en los que participará este colaborador.
                      </p>
                      <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto border p-4 rounded-xl bg-accent/20">
                        {templates.map(temp => {
                          const isExpanded = expandedTeamTemplates[temp.id];
                          return (
                          <div key={temp.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                            <div 
                              className="flex justify-between items-center cursor-pointer py-2 select-none"
                              onClick={() => setExpandedTeamTemplates(prev => ({ ...prev, [temp.id]: !prev[temp.id] }))}
                            >
                              <h4 className="font-semibold text-primary">{temp.title}</h4>
                              <span className={cn("transition-transform duration-200", isExpanded ? "rotate-180" : "")}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                              </span>
                            </div>
                            {isExpanded && (
                            <div className="flex flex-col gap-2 mt-3">
                              {temp.steps.map((step, sIdx) => {
                                const isStepAssigned = String(step.assignedTo) === String(editingMember?.id || 'temp_new_member');
                                
                                return (
                                  <div key={sIdx} className="flex items-center justify-between p-3 bg-background rounded-lg border shadow-sm">
                                    <span className="text-sm truncate mr-4">
                                      <strong className="text-primary mr-2">Paso {sIdx + 1}</strong>
                                      {step.title}
                                    </span>
                                    <div className="inline-flex rounded-full overflow-hidden border">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          modifiedTemplateIds.add(temp.id);
                                          setTemplates(prev => prev.map(t => {
                                            if (t.id !== temp.id) return t;
                                            const updatedSteps = [...t.steps];
                                            updatedSteps[sIdx] = { ...updatedSteps[sIdx], assignedTo: editingMember?.id || 'temp_new_member' };
                                            return { ...t, steps: updatedSteps };
                                          }));
                                          if (!formData.assignedProcesses.includes(temp.id)) {
                                            setFormData(prev => ({
                                              ...prev,
                                              assignedProcesses: [...prev.assignedProcesses, temp.id]
                                            }));
                                          }
                                        }}
                                        className={cn(
                                          "px-3 py-1 text-xs font-bold transition-colors",
                                          isStepAssigned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        )}
                                      >Sí</button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          modifiedTemplateIds.add(temp.id);
                                          setTemplates(prev => prev.map(t => {
                                            if (t.id !== temp.id) return t;
                                            const updatedSteps = [...t.steps];
                                            if (String(updatedSteps[sIdx].assignedTo) === String(editingMember?.id || 'temp_new_member')) {
                                              updatedSteps[sIdx] = { ...updatedSteps[sIdx], assignedTo: '' };
                                            }
                                            return { ...t, steps: updatedSteps };
                                          }));
                                        }}
                                        className={cn(
                                          "px-3 py-1 text-xs font-bold transition-colors",
                                          !isStepAssigned ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        )}
                                      >No</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            )}
                          </div>
                        );})}
                        {templates.length === 0 && (
                          <span className="text-sm text-muted-foreground italic">
                            No hay plantillas de procesos disponibles.
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-end gap-3 pt-6 mt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    if (step > 1) {
                      setStep(prev => prev - 1);
                    } else {
                      onClose();
                    }
                  }}
                  className="rounded-full"
                >
                  {step > 1 ? 'Atrás' : 'Cancelar'}
                </Button>
                <Button type="submit" className="rounded-full">
                  {step === 3 ? 'Guardar Miembro' : 'Siguiente'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
