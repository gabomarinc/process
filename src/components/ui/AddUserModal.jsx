import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '../../lib/utils';

export const AddUserModal = ({
  isOpen,
  onClose,
  step,
  setStep,
  formData,
  setFormData,
  handleSave,
  error,
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
    }
    setStep(prev => prev + 1);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <motion.div
        className="w-full max-w-md mx-auto py-8 px-4"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button type="button" className="close-btn-aesthetic" onClick={onClose} title="Cerrar"><X size={20} /></button>
        </div>

        <Card className="border shadow-md rounded-3xl overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>👤 Registrar Nuevo Usuario</CardTitle>
                <div className="inline-flex mt-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  Paso {step} de 2
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Stepper Progress Bar */}
            <div className="flex gap-2 mb-6">
              <div className="flex-1 h-1.5 rounded-full bg-primary" />
              <div className={cn("flex-1 h-1.5 rounded-full", step >= 2 ? "bg-primary" : "bg-muted")} />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={step < 2 ? handleNextStep : handleSave} className="space-y-6">
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
                      <Label>Contraseña Temporal <span className="text-destructive">*</span></Label>
                      <Input 
                        type="password" 
                        value={formData.password} 
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                        required 
                        autoFocus
                        className="focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rol del Usuario <span className="text-destructive">*</span></Label>
                      <Select 
                        value={formData.role} 
                        onValueChange={(val) => setFormData({ ...formData, role: val })}
                      >
                        <SelectTrigger className="focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">Agente (Miembro de equipo)</SelectItem>
                          <SelectItem value="guest">Invitado (Cliente o Proveedor)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Los invitados tienen un límite estricto de hasta 10 por empresa.
                      </p>
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
                      setStep(1);
                    } else {
                      onClose();
                    }
                  }}
                  className="rounded-full"
                >
                  {step > 1 ? 'Atrás' : 'Cancelar'}
                </Button>
                <Button type="submit" className="rounded-full">
                  {step === 2 ? 'Crear Usuario' : 'Siguiente'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
