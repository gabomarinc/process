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
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
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
      isNewClient: clientMode === 'new'
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onCancel}>
      <motion.div
        className="w-full max-w-4xl mx-auto py-8 px-4"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="close-btn-aesthetic" onClick={onCancel} title="Cerrar"><X size={20} /></button>
        </div>

        <Card className="border shadow-md rounded-3xl overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="bg-primary/10 text-primary rounded-full p-2">
                <Rocket size={20} />
              </div>
              Iniciar Nueva Ejecución
            </CardTitle>
            <CardDescription>
              Configura los parámetros para desplegar este proceso.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side: Calendar */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-full">
                    <ChevronLeft size={16} />
                  </Button>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={format(currentMonth, "MMMM yyyy")}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium text-sm capitalize"
                    >
                      {format(currentMonth, "MMMM yyyy")}
                    </motion.div>
                  </AnimatePresence>
                  <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-full">
                    <ChevronRight size={16} />
                  </Button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const isSelected = startDate && isSameDay(day, startDate);
                    const isMuted = !isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <motion.div
                        key={day.toString()}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="ghost"
                          onClick={() => setStartDate(day)}
                          className={cn(
                            "h-9 w-9 p-0 rounded-full font-normal",
                            isMuted ? "text-muted-foreground opacity-50" : "text-foreground",
                            isToday ? "bg-accent font-semibold" : "",
                            isSelected ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold" : ""
                          )}
                        >
                          {format(day, "d")}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              
              {/* Right Side: Inputs */}
              <div className="space-y-6">
                
                <div className="space-y-2">
                  <Label>Plantilla a ejecutar <span className="text-destructive">*</span></Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="-- Seleccionar Plantilla --" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cliente / Nombre de la Ejecución <span className="text-destructive">*</span></Label>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div 
                      onClick={() => { setClientMode('existing'); setLaunchInstanceName(''); setClientSearchQuery(''); }}
                      className={cn(
                        "p-3 border rounded-xl cursor-pointer text-center transition-all",
                        clientMode === 'existing' ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                      )}
                    >
                      <div className={cn("font-medium text-sm", clientMode === 'existing' ? "text-primary" : "text-foreground")}>Cliente Existente</div>
                      <div className="text-xs text-muted-foreground mt-1">Seleccionar del registro</div>
                    </div>
                    
                    <div 
                      onClick={() => { setClientMode('new'); setLaunchInstanceName(''); setClientSearchQuery(''); }}
                      className={cn(
                        "p-3 border rounded-xl cursor-pointer text-center transition-all",
                        clientMode === 'new' ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                      )}
                    >
                      <div className={cn("font-medium text-sm", clientMode === 'new' ? "text-primary" : "text-foreground")}>Cliente Nuevo</div>
                      <div className="text-xs text-muted-foreground mt-1">Registrar uno nuevo</div>
                    </div>
                  </div>

                  {clientMode === 'new' ? (
                    <Input
                      type="text"
                      placeholder="Ej. Empresa ABC"
                      value={launchInstanceName}
                      onChange={(e) => setLaunchInstanceName(e.target.value)}
                      className="focus:ring-2 focus:ring-primary/20"
                    />
                  ) : (
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={clientSearchQuery}
                        onChange={(e) => {
                          setClientSearchQuery(e.target.value);
                          setLaunchInstanceName('');
                          setShowClientDropdown(true);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                        className="focus:ring-2 focus:ring-primary/20"
                      />
                      {showClientDropdown && (
                        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-40 overflow-y-auto">
                          {clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())).length > 0 ? (
                            clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())).map(c => (
                              <div 
                                key={c.id} 
                                className="p-2 cursor-pointer border-b last:border-b-0 hover:bg-accent text-sm"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setClientSearchQuery(c.name);
                                  setLaunchInstanceName(c.name);
                                  setShowClientDropdown(false);
                                }}
                              >
                                {c.name}
                              </div>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-muted-foreground">No se encontraron clientes</div>
                          )}
                        </Card>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Inicio Elegida</Label>
                  <div className="bg-accent/50 p-3 rounded-xl border text-sm text-primary font-medium">
                    {startDate ? format(startDate, "dd 'de' MMMM, yyyy") : "Selecciona una fecha en el calendario"}
                  </div>
                </div>

                {selectedTemplateId && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      Miembros Involucrados ({involvedMembers.length})
                    </Label>
                    {involvedMembers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {involvedMembers.map(m => (
                          <div key={m.id} className="flex items-center gap-1.5 bg-accent rounded-full py-1 px-2 border text-xs">
                            {m.avatar ? (
                              <img src={m.avatar} alt={m.name} className="w-5 h-5 rounded-full" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                                {m.name.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium truncate max-w-[80px]">{m.name.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nadie asignado por defecto en esta plantilla.
                      </p>
                    )}
                  </div>
                )}
                
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 pt-6 border-t bg-accent/20">
            <Button variant="outline" onClick={onCancel} className="rounded-full">Cancelar</Button>
            <Button onClick={handleSchedule} disabled={!startDate || !selectedTemplateId || !launchInstanceName.trim()} className="rounded-full">
              Lanzar Ejecución
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};
