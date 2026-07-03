import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Rocket, Trash2, Edit2, Plus, Users, ListChecks } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '../../lib/utils';

export const TemplateDetailsModal = ({
  isOpen,
  onClose,
  activeTemplate,
  onLaunch,
  onDelete,
  saveTemplate,
  teamMembers,
  detailModalTab,
  setDetailModalTab,
  draftAssignment,
  setDraftAssignment,
  editingStepIndex,
  setEditingStepIndex,
  editingStepData,
  setEditingStepData,
  handleUpdateStep,
  handleDeleteStep,
  handleAddStep,
  expandedTemplateMembers,
  setExpandedTemplateMembers,
  setActiveTemplate,
  setTicketModal
}) => {
  useEffect(() => {
    if (activeTemplate && activeTemplate.steps && teamMembers) {
      const initial = {};
      teamMembers.forEach(m => {
        initial[m.id] = (activeTemplate.steps || [])
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => s && String(s.assignedTo) === String(m.id))
          .map(({ i }) => i);
      });
      setDraftAssignment(initial);
    }
  }, [activeTemplate, teamMembers, setDraftAssignment]);

  if (!isOpen || !activeTemplate) return null;

  const stepsList = (activeTemplate.steps || []).filter(Boolean);

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <motion.div
        className="w-full max-w-4xl mx-auto py-8 px-4"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
        </div>

        <Card className="border shadow-md rounded-3xl overflow-hidden flex flex-col" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', maxHeight: '85vh' }}>
          
          <div className="p-6 border-b flex justify-between items-start shrink-0">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{activeTemplate.companionAvatar}</span>
                <div>
                  <h2 className="text-2xl font-bold text-foreground font-serif">{activeTemplate.title}</h2>
                  <p className="text-muted-foreground mt-1">{activeTemplate.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full">
                  Guía: {activeTemplate.companionName}
                </span>
                <span className="bg-secondary text-secondary-foreground text-sm font-semibold px-3 py-1 rounded-full">
                  Duración: {activeTemplate.durationDays} días
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">Categoría:</span>
                  <Input 
                    value={activeTemplate.category || ''} 
                    onChange={(e) => saveTemplate({ ...activeTemplate, category: e.target.value })} 
                    className="h-8 w-32 focus:ring-2 focus:ring-primary/20 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={onLaunch} className="rounded-full shadow-sm">
                <Rocket size={16} className="mr-2" /> Iniciar Ejecución
              </Button>
              <Button variant="destructive" onClick={() => onDelete(activeTemplate.id)} className="rounded-full">
                <Trash2 size={16} className="mr-2" /> Eliminar Plantilla
              </Button>
            </div>
          </div>

          <div className="flex px-6 pt-4 border-b shrink-0 gap-4">
            <button 
              className={cn(
                "pb-3 font-semibold transition-colors flex items-center gap-2 border-b-2",
                detailModalTab === 'steps' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setDetailModalTab('steps')}
            >
              <ListChecks size={18} /> Pasos del Proceso
            </button>
            <button 
              className={cn(
                "pb-3 font-semibold transition-colors flex items-center gap-2 border-b-2",
                detailModalTab === 'team' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setDetailModalTab('team');
                const initial = {};
                teamMembers.forEach(m => {
                  initial[m.id] = activeTemplate.steps
                    .map((s, i) => ({ s, i }))
                    .filter(({ s }) => String(s.assignedTo) === String(m.id))
                    .map(({ i }) => i);
                });
                setDraftAssignment(initial);
              }}
            >
              <Users size={18} /> Asignación del Equipo
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {detailModalTab === 'steps' ? (
              <div className="space-y-4">
                {stepsList.map((step, idx) => {
                  const isEditing = editingStepIndex === idx;

                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {idx + 1}
                      </div>
                      
                      <Card className={cn("flex-1 transition-all duration-300", isEditing ? "ring-2 ring-primary border-transparent" : "border")}>
                        {isEditing ? (
                          <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="col-span-2 space-y-1.5">
                                <Label>Título del Paso</Label>
                                <Input 
                                  value={editingStepData.title}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, title: e.target.value })}
                                />
                              </div>
                              <div className="col-span-1 space-y-1.5">
                                <Label>Día relativo</Label>
                                <Input 
                                  type="number" 
                                  value={editingStepData.relativeOffsetDays}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, relativeOffsetDays: parseInt(e.target.value) || 1 })}
                                  min="1"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label>Descripción del paso</Label>
                              <Textarea 
                                className="min-h-[60px]"
                                value={editingStepData.description}
                                onChange={(e) => setEditingStepData({ ...editingStepData, description: e.target.value })}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="col-span-1 space-y-1.5">
                                <Label>Tipo de Acción</Label>
                                <Select 
                                  value={editingStepData.type}
                                  onValueChange={(val) => setEditingStepData({ ...editingStepData, type: val })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="manual">Paso Manual (Checkbox)</SelectItem>
                                    <SelectItem value="digital">Acción Digital (Archivo)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2 space-y-1.5">
                                <Label>Mensaje Motivador (Diseño Emocional)</Label>
                                <Input 
                                  value={editingStepData.motivation}
                                  onChange={(e) => setEditingStepData({ ...editingStepData, motivation: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label>Responsable Asignado a este Paso</Label>
                              <Select
                                value={editingStepData.assignedTo || 'none'}
                                onValueChange={(val) => setEditingStepData({ ...editingStepData, assignedTo: val === 'none' ? '' : val })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- Sin asignar (Nadie) --</SelectItem>
                                  {teamMembers.map(m => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                      {m.name} ({m.role}) - {m.department || 'Sin Área'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <Button variant="outline" onClick={() => setEditingStepIndex(null)} size="sm" className="rounded-full">
                                Cancelar
                              </Button>
                              <Button 
                                onClick={() => {
                                  handleUpdateStep(activeTemplate.id, idx, editingStepData);
                                  setEditingStepIndex(null);
                                }}
                                size="sm" className="rounded-full"
                              >
                                Guardar Paso
                              </Button>
                            </div>
                          </CardContent>
                        ) : (
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-foreground text-lg">{step.title}</h4>
                                <span className="text-xs font-semibold text-primary">
                                  Límite estimado: {step.durationLabel} (+{step.relativeOffsetDays}d)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-xs font-bold px-2 py-1 rounded-full",
                                  step.type === 'digital' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                                )}>
                                  {step.type === 'digital' ? 'Acción Digital' : 'Paso Manual'}
                                </span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => {
                                  setEditingStepIndex(idx);
                                  setEditingStepData(step);
                                }}>
                                  <Edit2 size={14} className="text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteStep(activeTemplate.id, idx)}>
                                  <Trash2 size={14} className="text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                            
                            <p className="text-muted-foreground text-sm mb-3">{step.description}</p>
                            
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <div className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                💡 {step.motivation}
                              </div>
                              {step.assignedTo && (
                                <div className="flex items-center gap-1.5 text-xs bg-accent px-2 py-1 rounded-full font-medium border">
                                  {(() => {
                                    const member = teamMembers.find(m => String(m.id) === String(step.assignedTo));
                                    return member ? (
                                      <>
                                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                                          {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <span>Asignado a: <strong className="text-foreground">{member.name}</strong> ({member.role})</span>
                                      </>
                                    ) : <span>Asignado</span>;
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    </div>
                  );
                })}

                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-2 border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:text-primary rounded-xl"
                  onClick={() => handleAddStep(activeTemplate.id)}
                >
                  <Plus size={16} className="mr-2" /> Agregar Nuevo Paso
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Activa o desactiva con el toggle cada paso donde el miembro interviene. Luego presiona <strong>Confirmar</strong> para guardar los cambios.
                </p>

                {teamMembers.length === 0 ? (
                  <div className="text-center py-10 bg-accent/20 rounded-2xl border border-dashed">
                    <p className="italic text-muted-foreground">No hay miembros de equipo registrados. Ve a la pestaña de "Equipo" para agregarlos.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamMembers.map(member => {
                      const draftSteps = draftAssignment[member.id] || [];
                      const isInvolved = draftSteps.length > 0;

                      return (
                        <Card key={member.id} className={cn("transition-all duration-300 overflow-hidden", isInvolved ? "border-primary/30 bg-primary/5 shadow-sm" : "")}>
                          <div className="p-5">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold border-2 border-primary/20">
                                {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-foreground">{member.name}</h4>
                                <span className="text-xs text-muted-foreground">
                                  {member.role}{member.department ? ` · ${member.department}` : ''}
                                </span>
                              </div>
                              {isInvolved && (
                                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                                  {draftSteps.length} paso{draftSteps.length !== 1 ? 's' : ''} asignado{draftSteps.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            <div className="flex justify-center mb-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-8 px-4 text-xs font-semibold"
                                onClick={() => setExpandedTemplateMembers(prev => ({ ...prev, [member.id]: !prev[member.id] }))}
                              >
                                {expandedTemplateMembers[member.id] ? 'Ocultar pasos' : 'Ver y asignar pasos'}
                                <span className={cn("transition-transform duration-200 ml-1.5", expandedTemplateMembers[member.id] ? "rotate-180" : "")}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </span>
                              </Button>
                            </div>

                            {expandedTemplateMembers[member.id] && (
                              <div className="flex flex-col gap-2 mb-4 bg-background p-3 rounded-xl border shadow-inner">
                                {stepsList.map((step, sIdx) => {
                                  const isOn = draftSteps.includes(sIdx);
                                  const ownedByOther = teamMembers.find(m =>
                                    m.id !== member.id &&
                                    (draftAssignment[m.id] || []).includes(sIdx)
                                  );

                                  return (
                                    <div
                                      key={sIdx}
                                      className={cn(
                                        "flex items-center justify-between p-3 rounded-lg transition-colors border",
                                        isOn ? "bg-primary/5 border-primary/20" : "bg-accent/30 border-transparent",
                                        ownedByOther ? "opacity-60" : ""
                                      )}
                                    >
                                      <span className="text-sm font-medium">
                                        <strong className="text-primary mr-2">Paso {sIdx + 1}</strong>
                                        {step.title}
                                        {ownedByOther && (
                                          <em className="text-xs text-muted-foreground ml-2 font-normal">
                                            (ya asignado a {ownedByOther.name})
                                          </em>
                                        )}
                                      </span>

                                      <div className="inline-flex rounded-full overflow-hidden border bg-background shrink-0">
                                        <button
                                          disabled={!!ownedByOther}
                                          onClick={() => {
                                            if (ownedByOther) return;
                                            setDraftAssignment(prev => {
                                              const current = prev[member.id] || [];
                                              const next = isOn
                                                ? current.filter(i => i !== sIdx)
                                                : [...current, sIdx];
                                              return { ...prev, [member.id]: next };
                                            });
                                          }}
                                          className={cn(
                                            "px-3 py-1 text-xs font-bold transition-colors",
                                            isOn ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                                            ownedByOther ? "cursor-not-allowed" : "cursor-pointer"
                                          )}
                                        >Sí</button>
                                        <button
                                          disabled={!!ownedByOther}
                                          onClick={() => {
                                            if (ownedByOther) return;
                                            setDraftAssignment(prev => {
                                              const current = prev[member.id] || [];
                                              const next = isOn
                                                ? current.filter(i => i !== sIdx)
                                                : [...current, sIdx];
                                              return { ...prev, [member.id]: next };
                                            });
                                          }}
                                          className={cn(
                                            "px-3 py-1 text-xs font-bold transition-colors",
                                            !isOn ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:bg-accent",
                                            ownedByOther ? "cursor-not-allowed" : "cursor-pointer"
                                          )}
                                        >No</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <Button
                              className="w-full rounded-full"
                              onClick={async () => {
                                const newSteps = stepsList.map((s, sIdx) => {
                                  if (String(s.assignedTo) === String(member.id)) {
                                    return { ...s, assignedTo: draftSteps.includes(sIdx) ? member.id : '' };
                                  }
                                  if (draftSteps.includes(sIdx) && !s.assignedTo) {
                                    return { ...s, assignedTo: member.id };
                                  }
                                  return s;
                                });
                                await saveTemplate({ ...activeTemplate, steps: newSteps });
                                onClose();
                                setTicketModal({
                                  isOpen: true,
                                  title: "¡Asignación Guardada!",
                                  message: `Se actualizaron los pasos de ${member.name} en la plantilla.`,
                                  ticketId: "Asignación de Pasos",
                                  customFields: [
                                    { label: "Colaborador", value: member.name },
                                    { label: "Plantilla", value: activeTemplate.title }
                                  ]
                                });
                              }}
                            >
                              ✅ Confirmar asignación de {member.name}
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
