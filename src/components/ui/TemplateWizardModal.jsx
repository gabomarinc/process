import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { cn } from '../../lib/utils';
import './TemplateWizardModal.css';

const steps = [
  { id: 'name', title: 'Nombre' },
  { id: 'objective', title: 'Objetivo' },
  { id: 'milestones', title: 'Hitos' },
  { id: 'duration', title: 'Duración' }
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const contentVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
};

export const TemplateWizardModal = ({ isOpen, onClose, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    milestones: '',
    duration: ''
  });

  if (!isOpen) return null;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const promptString = `
    Nombre del proceso: ${formData.name}
    Objetivo principal: ${formData.objective}
    Hitos o entregables clave: ${formData.milestones}
    Duración aproximada: ${formData.duration} días
    `;
    onSubmit(promptString, formData.name);
    setCurrentStep(0);
    setFormData({ name: '', objective: '', milestones: '', duration: '' });
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.name.trim() !== '';
      case 1:
        return formData.objective.trim() !== '';
      case 2:
        return formData.milestones.trim() !== '';
      case 3:
        return formData.duration !== '';
      default:
        return true;
    }
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

        {/* Progress indicator */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center"
                whileHover={{ scale: 1.1 }}
              >
                <motion.div
                  className={cn(
                    "w-4 h-4 rounded-full cursor-pointer transition-colors duration-300",
                    index < currentStep
                      ? "bg-primary"
                      : index === currentStep
                        ? "bg-primary ring-4 ring-primary/20"
                        : "bg-muted"
                  )}
                  onClick={() => {
                    if (index <= currentStep) {
                      setCurrentStep(index);
                    }
                  }}
                  whileTap={{ scale: 0.95 }}
                />
                <motion.span
                  className={cn(
                    "text-xs mt-1.5 hidden sm:block",
                    index === currentStep
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </motion.span>
              </motion.div>
            ))}
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border shadow-md rounded-3xl overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={contentVariants}
                >
                  {/* Step 1: Nombre */}
                  {currentStep === 0 && (
                    <>
                      <CardHeader>
                        <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <Sparkles size={20} className="text-primary" /> Asistente de Plantillas
                        </CardTitle>
                        <CardDescription>
                          ¿Cómo se llama el proceso?
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <motion.div variants={fadeInUp} className="space-y-2">
                          <Label htmlFor="name">Nombre del Proceso</Label>
                          <Input
                            id="name"
                            placeholder="Ej: Onboarding de nuevos empleados..."
                            value={formData.name}
                            onChange={(e) => updateFormData('name', e.target.value)}
                            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            autoFocus
                          />
                        </motion.div>
                      </CardContent>
                    </>
                  )}

                  {/* Step 2: Objetivo */}
                  {currentStep === 1 && (
                    <>
                      <CardHeader>
                        <CardTitle>Objetivo Principal</CardTitle>
                        <CardDescription>
                          ¿Cuál es el objetivo principal de este proceso?
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <motion.div variants={fadeInUp} className="space-y-2">
                          <Label htmlFor="objective">Descripción del objetivo</Label>
                          <Textarea
                            id="objective"
                            placeholder="Ej: Asegurar que el empleado tenga todos sus accesos listos el primer día..."
                            value={formData.objective}
                            onChange={(e) => updateFormData('objective', e.target.value)}
                            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px]"
                            autoFocus
                          />
                        </motion.div>
                      </CardContent>
                    </>
                  )}

                  {/* Step 3: Hitos */}
                  {currentStep === 2 && (
                    <>
                      <CardHeader>
                        <CardTitle>Entregables Clave</CardTitle>
                        <CardDescription>
                          ¿Cuáles son los entregables o hitos clave?
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <motion.div variants={fadeInUp} className="space-y-2">
                          <Label htmlFor="milestones">Lista de Hitos</Label>
                          <Textarea
                            id="milestones"
                            placeholder="Ej: Firmar contrato, Entrega de laptop, Presentación al equipo..."
                            value={formData.milestones}
                            onChange={(e) => updateFormData('milestones', e.target.value)}
                            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px]"
                            autoFocus
                          />
                        </motion.div>
                      </CardContent>
                    </>
                  )}

                  {/* Step 4: Duración */}
                  {currentStep === 3 && (
                    <>
                      <CardHeader>
                        <CardTitle>Duración del Proceso</CardTitle>
                        <CardDescription>
                          ¿Aproximadamente cuántos días dura en total?
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <motion.div variants={fadeInUp} className="space-y-2">
                          <Label htmlFor="duration">Número de días</Label>
                          <Input
                            id="duration"
                            type="number"
                            placeholder="Ej: 5"
                            value={formData.duration}
                            onChange={(e) => updateFormData('duration', e.target.value)}
                            min="1"
                            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            autoFocus
                          />
                        </motion.div>
                      </CardContent>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <CardFooter className="flex justify-between pt-6 pb-4">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="flex items-center gap-1 transition-all duration-300 rounded-2xl"
                  >
                    <ChevronLeft className="h-4 w-4" /> Atrás
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    onClick={currentStep === steps.length - 1 ? handleSubmit : nextStep}
                    disabled={!isStepValid()}
                    className={cn(
                      "flex items-center gap-1 transition-all duration-300 rounded-2xl"
                    )}
                  >
                    {currentStep === steps.length - 1 ? "Generar Plantilla" : "Siguiente"}
                    {currentStep === steps.length - 1 ? (
                      <Sparkles className="h-4 w-4 ml-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </motion.div>
              </CardFooter>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};
