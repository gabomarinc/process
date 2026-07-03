import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, Edit2, X } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '../../lib/utils';
import './TemplatePreviewModal.css';

export const TemplatePreviewModal = ({ isOpen, onClose, initialData, onSave }) => {
  const [template, setTemplate] = useState(null);
  const [expandedStepIndex, setExpandedStepIndex] = useState(null);

  useEffect(() => {
    if (isOpen && initialData) {
      setTemplate(JSON.parse(JSON.stringify(initialData)));
      setExpandedStepIndex(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen || !template) return null;

  const toggleStep = (index) => {
    setExpandedStepIndex(prev => prev === index ? null : index);
  };

  const handleTemplateChange = (field, value) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...template.steps];
    newSteps[index][field] = value;
    setTemplate(prev => ({ ...prev, steps: newSteps }));
  };

  const handleAddStep = () => {
    const newSteps = [...template.steps];
    newSteps.push({
      title: "Nuevo Paso",
      description: "Descripción del paso",
      type: "manual",
      relativeOffsetDays: newSteps.length + 1,
      durationLabel: `Día ${newSteps.length + 1}`,
      motivation: "¡Tú puedes!"
    });
    setTemplate(prev => ({ ...prev, steps: newSteps }));
    setExpandedStepIndex(newSteps.length - 1);
  };

  const handleDeleteStep = (index) => {
    const newSteps = template.steps.filter((_, i) => i !== index);
    setTemplate(prev => ({ ...prev, steps: newSteps }));
  };

  const handleSave = () => {
    onSave(template);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <motion.div
        className="w-full max-w-2xl mx-auto py-8 px-4"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
        </div>

        <Card className="border shadow-md rounded-3xl overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Edit2 size={20} className="text-primary" /> Vista Previa de Plantilla
            </CardTitle>
            <CardDescription>
              Revisa y ajusta los detalles generales y los pasos antes de guardar.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6" style={{ overflowY: 'auto' }}>
            {/* Detalles Generales */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg border-b pb-2">Detalles Generales</h3>
              
              <div className="space-y-2">
                <Label>Título de la Plantilla</Label>
                <Input 
                  value={template.title} 
                  onChange={e => handleTemplateChange('title', e.target.value)} 
                  className="focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea 
                  value={template.description} 
                  onChange={e => handleTemplateChange('description', e.target.value)} 
                  className="focus:ring-2 focus:ring-primary/20 min-h-[60px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Guía (IA)</Label>
                  <Input 
                    value={template.companionName || ''} 
                    onChange={e => handleTemplateChange('companionName', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Avatar (Emoji)</Label>
                  <Input 
                    value={template.companionAvatar || ''} 
                    onChange={e => handleTemplateChange('companionAvatar', e.target.value)} 
                    maxLength={2} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Saludo de Bienvenida</Label>
                <Textarea 
                  value={template.companionGreeting || ''} 
                  onChange={e => handleTemplateChange('companionGreeting', e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </div>

            {/* Pasos */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-medium text-lg">Pasos del Proceso ({template.steps?.length || 0})</h3>
                <Button variant="outline" size="sm" onClick={handleAddStep} className="rounded-full flex gap-1">
                  <Plus size={14} /> Añadir Paso
                </Button>
              </div>
              
              <div className="space-y-3">
                {template.steps?.map((step, index) => {
                  const isExpanded = expandedStepIndex === index;
                  return (
                  <Card key={index} className="overflow-hidden transition-all duration-200">
                    <div 
                      className={cn("p-3 flex items-center gap-3 cursor-pointer transition-colors", isExpanded ? "bg-accent/50" : "hover:bg-accent/30")}
                      onClick={() => toggleStep(index)}
                    >
                      <div className="bg-primary/10 text-primary font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 flex flex-col min-w-0">
                        <Input 
                          value={step.title} 
                          onChange={e => handleStepChange(index, 'title', e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="h-8 bg-transparent border-transparent px-2 font-medium focus:border-input focus:bg-background"
                        />
                        {!isExpanded && (
                          <span className="text-xs text-muted-foreground px-2 truncate">
                            {step.durationLabel || `Día ${step.relativeOffsetDays || 0}`} • {step.type === 'manual' ? 'Manual' : 'Digital'}
                          </span>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-full"
                        onClick={(e) => { e.stopPropagation(); handleDeleteStep(index); }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4 pt-2 space-y-4 border-t border-dashed"
                      >
                        <div className="space-y-2">
                          <Label>Descripción del Paso</Label>
                          <Textarea 
                            value={step.description} 
                            onChange={e => handleStepChange(index, 'description', e.target.value)}
                            className="min-h-[60px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Día (Offset)</Label>
                            <Input 
                              type="number" 
                              value={step.relativeOffsetDays || 0} 
                              onChange={e => handleStepChange(index, 'relativeOffsetDays', parseInt(e.target.value))} 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo de Paso</Label>
                            <Select value={step.type} onValueChange={value => handleStepChange(index, 'type', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="digital">Digital (Subir Archivo)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </Card>
                )})}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end gap-3 pt-4 border-t bg-accent/20">
            <Button variant="outline" onClick={onClose} className="rounded-full">Cancelar</Button>
            <Button onClick={handleSave} className="rounded-full flex items-center gap-1">
              <Save size={16} /> Guardar Plantilla
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};
