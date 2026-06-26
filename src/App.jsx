import React, { useState, useEffect } from 'react';
import { 
  mockProcesses as initialTemplates 
} from './data/mockData';
import { 
  Upload, 
  Sparkles, 
  Calendar, 
  Smile, 
  Check, 
  Clock,
  FileCheck,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  Play,
  FileText,
  AlertCircle,
  Bell,
  Trash2,
  ArrowRight,
  MoreHorizontal,
  Zap,
  Code,
  Share2,
  Users
} from 'lucide-react';

function App() {

  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'forgot', 'reset'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', companyName: '', rememberMe: false });
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    // Intercept fetch to inject Auth headers for all API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      let [resource, config] = args;
      const currentToken = localStorage.getItem('token');
      
      if (typeof resource === 'string' && resource.startsWith('/api/') && !resource.startsWith('/api/auth/')) {
        config = config || {};
        config.headers = config.headers || {};
        if (currentToken) {
          config.headers['Authorization'] = `Bearer ${currentToken}`;
        }
      }
      
      const response = await originalFetch(resource, config);
      if (response.status === 401 || response.status === 403) {
        if (currentToken) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.reload();
        }
      }
      return response;
    };

    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('resetToken');
    if (tokenParam) {
      setResetToken(tokenParam);
      setAuthView('reset');
    }
    
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Force logout if old user object without organizationId
      if (!parsedUser.organizationId) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
        return;
      }
      setUser(parsedUser);
    }

    return () => { window.fetch = originalFetch; };
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');
    
    let endpoint = '';
    if (authView === 'login') endpoint = '/api/auth/login';
    else if (authView === 'register') endpoint = '/api/auth/register';
    else if (authView === 'forgot') endpoint = '/api/auth/forgot-password';
    else if (authView === 'reset') endpoint = '/api/auth/reset-password';

    try {
      const payload = { ...authForm, token: resetToken, newPassword: authForm.password };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operación fallida');
      
      if (authView === 'forgot') {
        setAuthSuccessMsg(data.message);
        setAuthForm({ ...authForm, email: '' });
      } else if (authView === 'reset') {
        setAuthSuccessMsg(data.message);
        setTimeout(() => {
          setAuthView('login');
          window.history.replaceState({}, document.title, "/");
        }, 3000);
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };


  // Templates (Process blueprints)
  const [templates, setTemplates] = useState([]);

  // Active Instances (Live executions of a process template)
  const [instances, setInstances] = useState([]);

  const [activeTab, setActiveTab] = useState('instances'); // 'instances', 'templates', or 'team'
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Team Management states
  const [teamMembers, setTeamMembers] = useState([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberFormData, setMemberFormData] = useState({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '' });

  // Modal / Form States
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchInstanceName, setLaunchInstanceName] = useState('');
  const [launchStartDate, setLaunchStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [launchTemplateId, setLaunchTemplateId] = useState(''); // template selected inside the launch modal

  // Stepper steps tracking
  const [memberModalStep, setMemberModalStep] = useState(1);
  const [addUserModalStep, setAddUserModalStep] = useState(1);
  const [launchModalStep, setLaunchModalStep] = useState(1);

  // AI & Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [manualText, setManualText] = useState('');

  // Notifications Log
  const [notificationLogs, setNotificationLogs] = useState([]);
  
  // API Key config
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [showPassword, setShowPassword] = useState(false);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState('');
  const [confettiList, setConfettiList] = useState([]);

  // Step Editing states
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [editingStepData, setEditingStepData] = useState({ title: '', description: '', type: 'manual', relativeOffsetDays: 1, motivation: '', assignedTo: '' });
  const [detailModalTab, setDetailModalTab] = useState('steps'); // 'steps' or 'team'
  const [draftAssignment, setDraftAssignment] = useState({}); // key: member.id, value: array of stepIndices that are toggled on

  // Configuration states
  const [orgUsers, setOrgUsers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserFormData, setNewUserFormData] = useState({ name: '', email: '', password: '', role: 'agent' });
  const [addUserError, setAddUserError] = useState('');
  const [profileFormData, setProfileFormData] = useState({ name: '', email: '', password: '' });
  const [orgFormData, setOrgFormData] = useState({ name: '' });
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');
  const [settingsErrorMsg, setSettingsErrorMsg] = useState('');

  // Fetch initial data from database
  useEffect(() => {
    const loadData = async () => {
      if (!localStorage.getItem('token')) return;

      try {
        const templatesRes = await fetch('/api/templates');
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
        // No default template selected to show the cards grid directly

        const instancesRes = await fetch('/api/instances');
        const instancesData = await instancesRes.json();
        setInstances(instancesData);
        if (instancesData.length > 0) {
          setSelectedInstanceId(instancesData[0].id);
        }

        const logsRes = await fetch('/api/notifications');
        const logsData = await logsRes.json();
        setNotificationLogs(logsData);

        const teamRes = await fetch('/api/team');
        const teamData = await teamRes.json();
        setTeamMembers(teamData);

        // Fetch users and organization details
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setProfileFormData({ name: parsed.name, email: parsed.email, password: '' });
          if (parsed.role === 'admin') {
            const usersRes = await fetch('/api/users');
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setOrgUsers(usersData);
            }
            const orgRes = await fetch('/api/organization');
            if (orgRes.ok) {
              const orgData = await orgRes.json();
              setOrgFormData({ name: orgData.name });
            }
          }
        }
      } catch (err) {
        console.error("Error al cargar datos desde Neon:", err);
      }
    };
    loadData();
  }, [token]);

  const activeInstance = instances.find(inst => inst.id === selectedInstanceId);
  const activeTemplate = templates.find(t => t.id === selectedTemplateId);

  // Trigger alert notifications for overdue steps and save to Neon DB
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      instances.forEach(async (inst) => {
        inst.steps.forEach(async (step) => {
          if (!step.isCompleted) {
            const dueDate = new Date(step.dueDate);
            if (now > dueDate) {
              const logId = `${inst.id}-${step.id}`;
              // Avoid duplicate logs
              if (notificationLogs.some(log => log.id === logId)) return;

              const newLog = {
                id: logId,
                instanceId: inst.id,
                stepId: step.id,
                instanceName: inst.instanceName,
                stepTitle: step.title,
                message: `⚠️ RETRASO: El paso "${step.title}" venció el ${dueDate.toLocaleDateString()}. Notificaciones enviadas al equipo de ${inst.category}.`
              };

              // Local state update
              setNotificationLogs(prev => [
                { ...newLog, time: new Date().toISOString() },
                ...prev
              ]);

              // Write to Neon DB
              try {
                await fetch('/api/notifications', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newLog)
                });
              } catch (err) {
                console.error("Error al guardar notificación de retraso en Neon:", err);
              }
            }
          }
        });
      });
    }, 10000); // Check for delays every 10 seconds

    return () => clearInterval(interval);
  }, [instances, notificationLogs]);

  const triggerConfetti = () => {
    const list = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + '%',
      delay: Math.random() * 1.5 + 's',
      color: ['#FF7043', '#FFB74D', '#4CAF50', '#00796B'][Math.floor(Math.random() * 4)],
      size: Math.random() * 8 + 6 + 'px'
    }));
    setConfettiList(list);
    setTimeout(() => setConfettiList([]), 4000);
  };

  // Mark step complete in instance
  const handleStepComplete = async (instanceId, stepId, isCompleted, uploadedName = null) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) return;

    const updatedSteps = inst.steps.map(s => {
      if (s.id !== stepId) return s;
      return {
        ...s,
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
        uploadedFileName: uploadedName || s.uploadedFileName
      };
    });

    // Update locally
    setInstances(prev => prev.map(i => {
      if (i.id === instanceId) {
        return { ...i, steps: updatedSteps };
      }
      return i;
    }));

    // Update in Neon PostgreSQL database
    try {
      await fetch(`/api/instances/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: updatedSteps })
      });
    } catch (err) {
      console.error("Error al guardar el progreso en Neon:", err);
    }

    // Trigger active assignee notification
    await checkAndNotifyActiveAssignee(inst, updatedSteps);

    // Celebration if all steps completed
    const allDone = updatedSteps.every(s => s.isCompleted);
    if (allDone && !inst.steps.every(s => s.isCompleted)) {
      setTimeout(() => {
        setCelebrationMsg(`¡Excelente! Has completado el proceso "${inst.instanceName}". Todo el equipo está al día. 🎉`);
        setShowCelebration(true);
        triggerConfetti();
      }, 300);
    } else if (isCompleted) {
      triggerConfetti();
    }
  };

  // Helper to log a notification if a newly active step has a team assignee
  const checkAndNotifyActiveAssignee = async (instance, steps) => {
    const nextStepIdx = steps.findIndex(s => !s.isCompleted);
    if (nextStepIdx === -1) return;

    const isPrevCompleted = nextStepIdx === 0 || steps[nextStepIdx - 1].isCompleted;
    if (!isPrevCompleted) return;

    const activeStep = steps[nextStepIdx];
    if (activeStep.assignedTo) {
      const assignee = teamMembers.find(m => m.id === activeStep.assignedTo);
      if (assignee) {
        const logId = `active-${instance.id}-${activeStep.id}`;
        if (notificationLogs.some(log => log.id === logId)) return;

        const message = `Paso "${activeStep.title}" activo. Responsable asignado: ${assignee.name} (${assignee.role}).`;
        const newLog = {
          id: logId,
          instanceId: instance.id,
          stepId: activeStep.id,
          instanceName: instance.instanceName,
          stepTitle: activeStep.title,
          message
        };

        setNotificationLogs(prev => [newLog, ...prev]);

        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLog)
          });
        } catch (err) {
          console.error("Error al registrar notificacion de asignacion:", err);
        }
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSettingsSuccessMsg('');
    setSettingsErrorMsg('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el perfil.');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setToken(data.token);
      setSettingsSuccessMsg('Perfil actualizado con éxito.');
      setProfileFormData(prev => ({ ...prev, password: '' }));
    } catch (err) {
      setSettingsErrorMsg(err.message);
    }
  };

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    setSettingsSuccessMsg('');
    setSettingsErrorMsg('');
    try {
      const res = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la empresa.');
      setSettingsSuccessMsg('Empresa actualizada con éxito.');
    } catch (err) {
      setSettingsErrorMsg(err.message);
    }
  };

  const handleAddOrgUser = async (e) => {
    e.preventDefault();
    setAddUserError('');
    
    if (newUserFormData.role === 'guest') {
      const currentGuestsCount = orgUsers.filter(u => u.role === 'guest').length;
      if (currentGuestsCount >= 10) {
        setAddUserError('Límite alcanzado: Cada empresa puede invitar hasta 10 miembros con rol de invitado.');
        return;
      }
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear usuario.');
      
      setOrgUsers(prev => [...prev, data]);
      setShowAddUserModal(false);
      setNewUserFormData({ name: '', email: '', password: '', role: 'agent' });
    } catch (err) {
      setAddUserError(err.message);
    }
  };

  const handleDeleteOrgUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de eliminar a este usuario? Ya no podrá acceder al sistema.')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario.');
      setOrgUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert(err.message);
    }
  };

  // Save (Create/Update) team member
  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!memberFormData.name || !memberFormData.role || !memberFormData.email) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    const memberId = editingMember ? editingMember.id : `m_${Date.now()}`;
    const newMember = { ...memberFormData, id: memberId };

    try {
      const url = editingMember ? `/api/team/${editingMember.id}` : '/api/team';
      const method = editingMember ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      
      if (res.ok) {
        if (editingMember) {
          setTeamMembers(prev => prev.map(m => m.id === memberId ? newMember : m));
        } else {
          setTeamMembers(prev => [...prev, newMember]);
        }
        setShowMemberModal(false);
        setEditingMember(null);
        setMemberFormData({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '' });
      } else {
        console.error("Error al guardar miembro del equipo");
      }
    } catch (err) {
      console.error("Error al guardar miembro del equipo:", err);
    }
  };

  // Delete team member
  const handleDeleteMember = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar a este miembro del equipo?")) return;
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error("Error al eliminar miembro del equipo:", err);
    }
  };

  // Launch a new instance from selected template
  const handleLaunchInstance = async (e) => {
    e.preventDefault();
    // Resolve which template to use: prefer the currently open detail modal, else the modal picker
    const templateToUse = activeTemplate || templates.find(t => t.id === launchTemplateId);
    if (!templateToUse || !launchInstanceName.trim()) return;

    const startDateTime = new Date(launchStartDate).getTime();
    
    const newInstance = {
      id: "inst_" + Date.now(),
      templateId: templateToUse.id,
      title: templateToUse.title,
      instanceName: launchInstanceName,
      startedAt: new Date(launchStartDate).toISOString(),
      companionName: templateToUse.companionName,
      companionAvatar: templateToUse.companionAvatar,
      companionGreeting: templateToUse.companionGreeting,
      category: templateToUse.category,
      steps: templateToUse.steps.map((step, idx) => {
        const offsetMs = step.relativeOffsetDays * 24 * 60 * 60 * 1000;
        const dueDate = new Date(startDateTime + offsetMs).toISOString();
        return {
          ...step,
          id: `step_run_${idx}_${Date.now()}`,
          dueDate,
          isCompleted: false,
          completedAt: null,
          uploadedFileName: null
        };
      })
    };

    // Update locally
    setInstances(prev => [newInstance, ...prev]);
    setSelectedInstanceId(newInstance.id);
    setShowLaunchModal(false);
    setLaunchInstanceName('');
    setLaunchTemplateId('');
    setActiveTab('instances');
    // Close the template detail modal if it was open
    setSelectedTemplateId('');
    triggerConfetti();

    // Trigger active assignee notification for the first step
    await checkAndNotifyActiveAssignee(newInstance, newInstance.steps);

    // Post to Express backend
    try {
      await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInstance)
      });
    } catch (err) {
      console.error("Error al iniciar instancia en Neon:", err);
    }
  };

  const deleteInstance = async (id, e) => {
    e.stopPropagation();
    setInstances(prev => prev.filter(inst => inst.id !== id));
    if (selectedInstanceId === id) {
      const remaining = instances.filter(inst => inst.id !== id);
      setSelectedInstanceId(remaining[0]?.id || "");
    }

    // Call Express DELETE endpoint
    try {
      await fetch(`/api/instances/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Error al eliminar ejecución en Neon:", err);
    }
  };

  // --- Process Template CRUD Operations ---

  const saveTemplate = async (updatedTemplate) => {
    setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
    try {
      await fetch(`/api/templates/${updatedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedTemplate.title,
          description: updatedTemplate.description,
          durationDays: updatedTemplate.durationDays,
          companionName: updatedTemplate.companionName,
          companionAvatar: updatedTemplate.companionAvatar,
          companionGreeting: updatedTemplate.companionGreeting,
          category: updatedTemplate.category,
          steps: updatedTemplate.steps
        })
      });
    } catch (err) {
      console.error("Error al actualizar la plantilla en Neon:", err);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta plantilla de forma permanente? Se borrará de Neon.")) return;
    setTemplates(prev => prev.filter(t => t.id !== id));
    setSelectedTemplateId("");
    try {
      await fetch(`/api/templates/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Error al eliminar la plantilla en Neon:", err);
    }
  };

  const handleUpdateStep = (templateId, stepIndex, updatedStep) => {
    const temp = templates.find(t => t.id === templateId);
    if (!temp) return;
    const updatedSteps = [...temp.steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      ...updatedStep,
      durationLabel: `Día ${updatedStep.relativeOffsetDays}`
    };

    // Recalculate template total durationDays
    const maxOffset = Math.max(...updatedSteps.map(s => s.relativeOffsetDays), 1);
    
    saveTemplate({ ...temp, durationDays: maxOffset, steps: updatedSteps });
  };

  const handleDeleteStep = (templateId, stepIndex) => {
    const temp = templates.find(t => t.id === templateId);
    if (!temp) return;
    const updatedSteps = temp.steps.filter((_, idx) => idx !== stepIndex);
    
    // Recalculate durationDays
    const maxOffset = updatedSteps.length > 0 ? Math.max(...updatedSteps.map(s => s.relativeOffsetDays), 1) : 1;

    saveTemplate({ ...temp, durationDays: maxOffset, steps: updatedSteps });
  };

  const handleAddStep = (templateId) => {
    const temp = templates.find(t => t.id === templateId);
    if (!temp) return;
    const nextDay = temp.steps.length + 1;
    const newStep = {
      title: "Nuevo Paso",
      description: "Describe qué se debe hacer en este paso.",
      type: "manual",
      relativeOffsetDays: nextDay,
      durationLabel: `Día ${nextDay}`,
      motivation: "¡Un paso más cerca de completar el proceso!"
    };
    const updatedSteps = [...temp.steps, newStep];
    saveTemplate({ ...temp, durationDays: nextDay, steps: updatedSteps });
  };

  // Save/Clear keys
  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', tempKey);
    setApiKey(tempKey);
    setShowKeyInput(false);
  };

  const clearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setTempKey('');
    setShowKeyInput(false);
  };

  // AI Prompt Call using fetch to v1beta gemini-flash-latest
  const generateTemplate = async (textSource, titleSuggestion = "Nuevo Proceso") => {
    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusMsg("Analizando directrices del proceso...");

    if (!apiKey) {
      // Fallback Mock Template
      setUploadStatusMsg("Simulando creación de plantilla (sin API Key)...");
      setTimeout(() => {
        const newTemp = {
          id: "t_" + Date.now(),
          title: titleSuggestion,
          description: `Plantilla generada a partir de las directrices de "${titleSuggestion}".`,
          durationDays: 3,
          companionName: "Mimi",
          companionAvatar: "🐰",
          companionGreeting: "¡Hola! He preparado esta plantilla de 3 días para ti. ¡A darle marcha!",
          category: "Operaciones",
          steps: [
            {
              title: "Reunión de kickoff",
              description: "Alinear al equipo y repasar objetivos.",
              type: "manual",
              relativeOffsetDays: 1,
              durationLabel: "Día 1",
              motivation: "¡Un buen inicio asegura el éxito!"
            },
            {
              title: "Subir entregable principal",
              description: "Cargar el reporte de requerimientos de la primera fase.",
              type: "digital",
              acceptedFormats: [".pdf", ".docx"],
              relativeOffsetDays: 2,
              durationLabel: "Día 2",
              motivation: "Almacenar tu progreso te dará tranquilidad mental."
            },
            {
              title: "Cierre de fase 1",
              description: "Validación de metas y firmas.",
              type: "manual",
              relativeOffsetDays: 3,
              durationLabel: "Día 3",
              motivation: "¡Llegamos al final! Gran esfuerzo colectivo."
            }
          ]
        };
        setTemplates(prev => [newTemp, ...prev]);
        setSelectedTemplateId(newTemp.id);
        setIsUploading(false);
        setManualText('');
        setActiveTab('templates');

        // Save to Database
        fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTemp)
        }).catch(err => console.error("Error al guardar plantilla simulada en Neon:", err));
      }, 2000);
      return;
    }

    try {
      setUploadProgress(30);
      setUploadStatusMsg("Consultando a Gemini AI...");

      const prompt = `
        Analiza el siguiente texto de directrices de un proceso organizacional y crea una plantilla estructurada de pasos interactivos en formato JSON.
        
        Asegúrate de aplicar principios de "Diseño Emocional" (Emotional Design):
        1. Asigna un nombre encantador y avatar (emoji) a un "companion" (compañero/guía) del proceso.
        2. Escribe saludos y mensajes de motivación empáticos, amigables, cálidos y que reduzcan el estrés o la ansiedad del usuario.
        3. Identifica cuáles pasos son físicos/manuales (deben ser "manual" en el tipo) y cuáles requieren subir un documento o entregable (deben ser "digital").
        4. Define un relativeOffsetDays (entero, ej: 1 para primer día, 3 para tercer día) para cada paso, lo cual servirá para calcular plazos a partir de una fecha de inicio.
        
        El resultado DEBE ser estrictamente un objeto JSON válido, sin ningún texto adicional, explicaciones ni formato HTML. Puedes usar bloques de código markdown si es necesario, pero asegúrate de que el JSON sea perfectamente analizable.
        
        Estructura esperada:
        {
          "title": "Título corto y amigable del Proceso (ej: Onboarding de Marketing)",
          "description": "Breve descripción empática del propósito del proceso",
          "durationDays": 3,
          "companionName": "Nombre del guía",
          "companionAvatar": "Un solo emoji adecuado para el guía",
          "companionGreeting": "Saludo motivador del guía para iniciar",
          "category": "Categoría (ej: Recursos Humanos, Operaciones, Legal)",
          "steps": [
            {
              "title": "Nombre corto del paso",
              "description": "Explicación clara de qué hacer",
              "type": "manual",
              "acceptedFormats": [".pdf", ".docx"],
              "relativeOffsetDays": 1,
              "durationLabel": "Día 1",
              "motivation": "Frase de motivación empática específica para este paso"
            }
          ]
        }
        
        Texto de directrices:
        """
        ${textSource}
        """
      `;

      setUploadProgress(60);
      setUploadStatusMsg("Analizando respuestas e hitos...");

      const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (responseText.includes("```")) {
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      }
      
      setUploadProgress(90);
      setUploadStatusMsg("Diseñando tu plantilla...");

      const parsedTemplate = JSON.parse(responseText);
      const tempId = "t_ai_" + Date.now();
      
      const finalTemplate = {
        ...parsedTemplate,
        id: tempId
      };

      setTemplates(prev => [finalTemplate, ...prev]);
      setSelectedTemplateId(tempId);
      setIsUploading(false);
      setManualText('');
      setActiveTab('templates');

      // Save to Neon DB
      try {
        await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalTemplate)
        });
      } catch (err) {
        console.error("Error al guardar plantilla generada en Neon:", err);
      }
      
    } catch (error) {
      console.error(error);
      setUploadStatusMsg("Error al generar flujo con IA.");
      setTimeout(() => {
        setIsUploading(false);
        alert(`Hubo un problema al consultar a Gemini: ${error.message || error}\n\nPor favor, verifica que tu API Key sea correcta.`);
      }, 1500);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusMsg("Cargando archivo...");

    const fileExtension = file.name.split('.').pop().toLowerCase();
    const titleSuggestion = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

    try {
      if (fileExtension === 'docx') {
        setUploadStatusMsg("Leyendo archivo Word (.docx)...");
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target.result;
            const result = await window.mammoth.extractRawText({ arrayBuffer });
            generateTemplate(result.value, titleSuggestion);
          } catch (err) {
            console.error(err);
            alert("No se pudo extraer texto del archivo Word.");
            setIsUploading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (fileExtension === 'pdf') {
        setUploadStatusMsg("Leyendo archivo PDF (.pdf)...");
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target.result;
            const pdfjsLib = window.pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(' ');
              fullText += pageText + '\n';
            }
            generateTemplate(fullText, titleSuggestion);
          } catch (err) {
            console.error(err);
            alert("No se pudo extraer texto del archivo PDF.");
            setIsUploading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setUploadStatusMsg("Leyendo archivo de texto...");
        const reader = new FileReader();
        reader.onload = (event) => {
          generateTemplate(event.target.result, titleSuggestion);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error(error);
      alert("Error al procesar el archivo.");
      setIsUploading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    generateTemplate(manualText, "Proceso Personalizado");
  };

  // Render Overdue Alerts Banner if any step is past due
  const checkOverdueSteps = (inst) => {
    const now = new Date();
    return inst.steps.some(step => !step.isCompleted && now > new Date(step.dueDate));
  };

  if (!token) {
    let title = 'Kônsul';
    let subtitle = 'Bienvenido de nuevo';
    let btnText = 'Iniciar Sesión';
    
    if (authView === 'register') {
      subtitle = 'Crea tu cuenta gratis';
      btnText = 'Registrarse';
    } else if (authView === 'forgot') {
      subtitle = 'Recupera tu acceso';
      btnText = 'Enviar enlace';
    } else if (authView === 'reset') {
      subtitle = 'Elige una nueva contraseña';
      btnText = 'Guardar contraseña';
    }

    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <img src="https://konsul.digital/images/Konsul%20logo%20general.png" alt="Kônsul Logo" style={{ height: '48px', objectFit: 'contain' }} />
          </div>
          <h2 className="auth-title">{title}</h2>
          <p className="auth-subtitle">{subtitle}</p>
          
          {authError && (
            <div style={{ backgroundColor: '#FFEBEE', color: '#D32F2F', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {authError}
            </div>
          )}

          {authSuccessMsg && (
            <div className="auth-success-msg">
              {authSuccessMsg}
            </div>
          )}

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authView === 'register' && (
              <>
                <input 
                  type="text" 
                  placeholder="Nombre completo" 
                  value={authForm.name}
                  onChange={e => setAuthForm({...authForm, name: e.target.value})}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Nombre de la empresa" 
                  value={authForm.companyName}
                  onChange={e => setAuthForm({...authForm, companyName: e.target.value})}
                  required
                />
              </>
            )}
            
            {(authView === 'login' || authView === 'register' || authView === 'forgot') && (
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                value={authForm.email}
                autoComplete="username"
                onChange={e => setAuthForm({...authForm, email: e.target.value})}
                required
              />
            )}
            
            {(authView === 'login' || authView === 'register' || authView === 'reset') && (
              <input 
                type="password" 
                placeholder={authView === 'reset' ? "Nueva contraseña" : "Contraseña"} 
                value={authForm.password}
                autoComplete={authView === 'login' ? "current-password" : "new-password"}
                onChange={e => setAuthForm({...authForm, password: e.target.value})}
                required
              />
            )}

            {authView === 'login' && (
              <div className="auth-options">
                <label className="auth-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={authForm.rememberMe}
                    onChange={e => setAuthForm({...authForm, rememberMe: e.target.checked})}
                  />
                  Recordarme
                </label>
                <span className="auth-forgot-link" onClick={() => { setAuthView('forgot'); setAuthError(''); setAuthSuccessMsg(''); }}>
                  ¿Olvidaste tu contraseña?
                </span>
              </div>
            )}

            <button type="submit" className="auth-btn">
              {btnText}
            </button>
          </form>

          {authView !== 'login' && authView !== 'reset' && (
            <div className="auth-switch" style={{marginTop: '1.5rem'}}>
              <span onClick={() => { setAuthView('login'); setAuthError(''); setAuthSuccessMsg(''); }}>
                ← Volver a Iniciar Sesión
              </span>
            </div>
          )}
          
          {authView === 'login' && (
            <div className="auth-switch">
              ¿No tienes cuenta?{' '}
              <span onClick={() => { setAuthView('register'); setAuthError(''); setAuthSuccessMsg(''); }}>
                Regístrate aquí
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="app-container">
      {/* Background Confetti */}
      {confettiList.map(c => (
        <span
          key={c.id}
          className="confetti"
          style={{
            left: c.left,
            animationDelay: c.delay,
            backgroundColor: c.color,
            width: c.size,
            height: c.size
          }}
        />
      ))}

      {/* Header */}
      <header className="app-header">
        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="https://konsul.digital/images/Konsul%20logo%20general.png" alt="Kônsul Logo" style={{ height: '36px', objectFit: 'contain' }} />
          <div className="logo-text" style={{ borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: '12px' }}>
            <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Process</h1>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Emotional Design Flow</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Empresa: <strong>{orgFormData.name || user?.companyName || 'Cargando...'}</strong> | Rol: <span className={`badge ${user?.role === 'admin' ? 'primary' : 'success'}`} style={{ textTransform: 'capitalize' }}>{user?.role}</span>
          </span>
          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={handleLogout}>
            Cerrar Sesión
          </button>
          <button 
            className={`api-key-badge ${apiKey ? 'configured' : ''}`}
            onClick={() => setShowKeyInput(!showKeyInput)}
          >
            <Key size={14} />
            <span>{apiKey ? 'API Key Guardada' : 'Configurar Gemini Key'}</span>
          </button>
          
          <div className="badge primary">
            <Sparkles size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Diseño Empático Activo
          </div>
        </div>
      </header>

      {/* API Configuration Drawer */}
      {showKeyInput && (
        <div className="api-drawer">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
            <Key size={16} /> Configura tu Gemini API Key
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Tu clave se guarda localmente en el navegador y permite usar la IA para analizar tus archivos y generar flujos reales.
          </p>
          <div className="api-input-group">
            <input 
              type={showPassword ? "text" : "password"}
              className="api-input"
              placeholder="AQ.Ab8..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
            />
            <button 
              className="btn btn-secondary"
              onClick={() => setShowPassword(!showPassword)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button className="btn btn-primary" onClick={saveApiKey}>Guardar</button>
            {apiKey && <button className="btn btn-secondary" onClick={clearApiKey}>Eliminar</button>}
          </div>
        </div>
      )}

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'instances' ? 'active' : ''}`}
          onClick={() => setActiveTab('instances')}
        >
          🔄 Ejecuciones Activas ({instances.length})
        </button>
        
        {user?.role !== 'guest' && (
          <>
            <button 
              className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              📂 Plantillas de Procesos ({templates.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              👥 Equipo de Trabajo ({teamMembers.length})
            </button>
          </>
        )}

        {user?.role === 'admin' && (
          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Configuración
          </button>
        )}
      </div>

      {/* Main Companion Banner (Active Execution only) */}
      {activeTab === 'instances' && activeInstance && (
        <div className="companion-card">
          <div className="companion-avatar">
            {activeInstance.companionAvatar}
          </div>
          <div className="companion-bubble">
            <h3>{activeInstance.companionName} • Tu Guía</h3>
            <p>
              {activeInstance.steps.every(s => s.isCompleted) 
                ? `¡Increíble logro! 🎉 Hemos terminado todo el flujo de "${activeInstance.instanceName}". ¡Estoy sumamente orgulloso/a de tu dedicación!`
                : `¡Hola! Estamos en marcha con "${activeInstance.instanceName}". ¡Confío plenamente en ti! 🧡`
              }
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className={activeTab === 'settings' ? '' : 'dashboard-grid'}>
        
        {/* Left Side: Display based on Active Tab */}
        <div className="card-section" style={activeTab === 'settings' ? { maxWidth: '1000px', margin: '0 auto 3rem auto' } : {}}>
          {activeTab === 'instances' ? (
            /* Active Execution checklist view */
            activeInstance ? (
              <div>
                <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)' }}>
                      {activeInstance.instanceName}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 400, marginTop: '4px' }}>
                      Plantilla base: {activeInstance.title} • Iniciado el {new Date(activeInstance.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {checkOverdueSteps(activeInstance) && (
                      <span className="overdue-badge">⚠️ Con Atraso</span>
                    )}
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      onClick={() => {
                        setLaunchInstanceName('');
                        setLaunchStartDate(new Date().toISOString().split('T')[0]);
                        setLaunchTemplateId('');
                        setShowLaunchModal(true);
                      }}
                    >
                      🚀 Nueva Ejecución
                    </button>
                  </div>
                </div>

                <div className="steps-container">
                  {(() => {
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

                    return activeInstance.steps.map((step, idx) => {
                      const isActive = !step.isCompleted && stepsActive[idx];
                      const isLocked = !step.isCompleted && !stepsActive[idx];
                      const isOverdue = !step.isCompleted && new Date() > new Date(step.dueDate);
                      
                      return (
                        <div 
                          key={step.id} 
                          className={`step-row ${step.isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                          style={{ opacity: isLocked ? 0.6 : 1 }}
                        >
                          <div className="step-indicator">
                            {step.isCompleted ? <Check size={22} /> : idx + 1}
                          </div>

                          <div className="step-card">
                            <div className="step-card-header">
                              <div>
                                <h4>{step.title}</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                                  {step.durationLabel} (Límite: {new Date(step.dueDate).toLocaleDateString()})
                                </span>
                              </div>
                              
                              <span className={`badge ${step.type === 'digital' ? 'success' : ''}`}>
                                {step.type === 'digital' ? 'Acción Digital' : 'Paso Manual'}
                              </span>
                            </div>
                            
                            <p>{step.description}</p>

                            {/* Overdue alert element */}
                            {isOverdue && (
                              <div className="overdue-banner">
                                <AlertCircle size={16} />
                                <span>Límite vencido el {new Date(step.dueDate).toLocaleDateString()}. Interesados notificados.</span>
                              </div>
                            )}

                            {!isLocked && (
                              <div className="step-action-area">
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
                                    <span>
                                      {step.isCompleted ? '¡Logrado con éxito!' : 'Marcar este paso como hecho'}
                                    </span>
                                  </label>
                                ) : (
                                  <div>
                                    {step.isCompleted ? (
                                      <div className="uploaded-badge">
                                        <FileCheck size={16} />
                                        <span>{step.uploadedFileName || 'Documento cargado'}</span>
                                      </div>
                                    ) : (
                                      <label className="step-file-upload" style={{ display: 'block' }}>
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
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                          <Upload size={16} className="text-primary" />
                                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                            Subir archivo requerido ({step.acceptedFormats?.join(', ')})
                                          </span>
                                        </div>
                                      </label>
                                    )}
                                  </div>
                                )}

                                {isActive && step.motivation && (
                                  <div className="step-motivation">
                                    💡 {step.motivation}
                                  </div>
                                )}

                                {step.assignedTo && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', background: '#f5f3f0', padding: '0.2rem 0.6rem', borderRadius: '20px', marginTop: '0.75rem', width: 'fit-content' }}>
                                    {(() => {
                                      const member = teamMembers.find(m => m.id === step.assignedTo);
                                      return member ? (
                                        <>
                                          <img src={member.avatar} alt={member.name} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
                                          <span>Responsable: <strong>{member.name}</strong> ({member.role})</span>
                                        </>
                                      ) : <span>Asignado</span>;
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>No hay ejecuciones activas</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Selecciona una plantilla e iníciala para comenzar a seguir un proceso en tiempo real.</p>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
                  onClick={() => {
                    setLaunchInstanceName('');
                    setLaunchStartDate(new Date().toISOString().split('T')[0]);
                    setLaunchTemplateId(templates[0]?.id || '');
                    setShowLaunchModal(true);
                  }}
                >
                  🚀 Iniciar Primera Ejecución
                </button>
              </div>
            )
          ) : activeTab === 'templates' ? (
            /* Templates View Grid & Popup details Modal */
            <div>
              <div className="section-title">
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)' }}>
                  Plantillas de Procesos
                </h2>
                <span className="badge primary">{templates.length} Plantillas</span>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                Selecciona una plantilla para ver sus pasos en detalle, iniciar una ejecución viva o modificar su estructura.
              </p>
              
              {templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <Smile size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
                  <h3>No hay plantillas creadas</h3>
                  <p>Utiliza el creador de la derecha para diseñar tu primera plantilla.</p>
                </div>
              ) : (
                <div className="templates-grid">
                  {templates.map(temp => (
                    <div 
                      key={temp.id} 
                      className="template-grid-card"
                      onClick={() => setSelectedTemplateId(temp.id)}
                    >
                      <div className="template-card-banner"></div>
                      <div className="template-card-body">
                        <div className="template-card-meta">
                          <div className="template-card-meta-left">
                            <span>⏱️ {temp.durationDays} {temp.durationDays === 1 ? 'día' : 'días'}</span>
                            <span>•</span>
                            <span className="status-dot"></span>
                            <span>Activo</span>
                          </div>
                          <button className="dots-menu-btn" onClick={(e) => { e.stopPropagation(); setSelectedTemplateId(temp.id); }}>
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                        
                        <h4 className="template-card-title">{temp.title}</h4>
                        
                        {temp.description && (
                          <p className="template-card-desc">
                            {temp.description.length > 90 ? temp.description.substring(0, 90) + '...' : temp.description}
                          </p>
                        )}
                        
                        <div className="template-card-badges">
                          <span className="template-card-badge">{temp.category || 'General'}</span>
                          <span className="template-card-badge">🤖 {temp.companionName || 'Guía'}</span>
                        </div>
                        
                        <hr className="template-card-divider" />
                        
                        <div className="template-card-footer">
                          <div className="avatar-group">
                            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="user" />
                            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="user" />
                            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="user" />
                            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="user" />
                          </div>
                          <div className="action-circles">
                            <button className="circle-btn blue" title="Iniciar Ejecución" onClick={(e) => { e.stopPropagation(); setSelectedTemplateId(temp.id); setShowLaunchModal(true); }}>
                              <Zap size={14} fill="currentColor" />
                            </button>
                            <button className="circle-btn dark" title="Ver Detalles" onClick={(e) => { e.stopPropagation(); setSelectedTemplateId(temp.id); }}>
                              <Code size={14} />
                            </button>
                            <button className="circle-btn red" title="Eliminar Plantilla" onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(temp.id); }}>
                              <Share2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Template details Modal Popup */}
              {selectedTemplateId && activeTemplate && (
                <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setSelectedTemplateId("")}>
                  <div className="modal-card" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                    
                    <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(220, 200, 190, 0.15)', paddingBottom: '1rem' }}>
                      <button className="back-btn" onClick={() => setSelectedTemplateId("")}>
                        ← Cerrar Detalles
                      </button>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => setShowLaunchModal(true)}>
                          🚀 Iniciar Ejecución
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDeleteTemplate(activeTemplate.id)}>
                          Eliminar Plantilla
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(220, 200, 190, 0.15)' }}>
                      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{activeTemplate.companionAvatar}</span>
                        <span>{activeTemplate.title}</span>
                      </h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem' }}>
                        {activeTemplate.description}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <span className="badge primary">Guía: {activeTemplate.companionName}</span>
                        <span className="badge">Duración: {activeTemplate.durationDays} días</span>
                        <span className="badge">Categoría: {activeTemplate.category || 'General'}</span>
                      </div>
                    </div>

                    {/* Tab Navigation inside Detail Modal */}
                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem', paddingBottom: '0.25rem' }}>
                      <button 
                        className={`tab-btn ${detailModalTab === 'steps' ? 'active' : ''}`}
                        style={{ 
                          padding: '0.5rem 1rem', 
                          border: 'none', 
                          background: 'none', 
                          fontWeight: 600, 
                          color: detailModalTab === 'steps' ? 'var(--color-primary)' : 'var(--text-muted)',
                          borderBottom: detailModalTab === 'steps' ? '2px solid var(--color-primary)' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => setDetailModalTab('steps')}
                      >
                        📋 Pasos del Proceso
                      </button>
                      <button 
                        className={`tab-btn ${detailModalTab === 'team' ? 'active' : ''}`}
                        style={{ 
                          padding: '0.5rem 1rem', 
                          border: 'none', 
                          background: 'none', 
                          fontWeight: 600, 
                          color: detailModalTab === 'team' ? 'var(--color-primary)' : 'var(--text-muted)',
                          borderBottom: detailModalTab === 'team' ? '2px solid var(--color-primary)' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setDetailModalTab('team');
                          // Initialise draftAssignment from current step data
                          const initial = {};
                          if (activeTemplate) {
                            teamMembers.forEach(m => {
                              initial[m.id] = activeTemplate.steps
                                .map((s, i) => ({ s, i }))
                                .filter(({ s }) => s.assignedTo === m.id)
                                .map(({ i }) => i);
                            });
                          }
                          setDraftAssignment(initial);
                        }}
                      >
                        👥 Asignación del Equipo
                      </button>
                    </div>

                    {detailModalTab === 'steps' ? (
                      <div className="steps-container">
                        {activeTemplate.steps.map((step, idx) => {
                          const isEditing = editingStepIndex === idx;

                          return (
                            <div key={idx} className="step-row">
                              <div className="step-indicator">{idx + 1}</div>
                              
                              <div className={`step-card ${isEditing ? 'step-editor-card' : ''}`} style={{ flexGrow: 1 }}>
                                {isEditing ? (
                                  /* Inline Step Editor Form */
                                  <div className="step-edit-form">
                                    <div className="step-edit-row">
                                      <div className="form-group" style={{ flex: 2 }}>
                                        <label>Título del Paso</label>
                                        <input 
                                          type="text" 
                                          className="form-input" 
                                          value={editingStepData.title}
                                          onChange={(e) => setEditingStepData({ ...editingStepData, title: e.target.value })}
                                        />
                                      </div>
                                      <div className="form-group" style={{ flex: 1 }}>
                                        <label>Día relativo</label>
                                        <input 
                                          type="number" 
                                          className="form-input" 
                                          value={editingStepData.relativeOffsetDays}
                                          onChange={(e) => setEditingStepData({ ...editingStepData, relativeOffsetDays: parseInt(e.target.value) || 1 })}
                                          min="1"
                                        />
                                      </div>
                                    </div>

                                    <div className="form-group">
                                      <label>Descripción del paso</label>
                                      <textarea 
                                        className="textarea-input" 
                                        style={{ minHeight: '60px' }}
                                        value={editingStepData.description}
                                        onChange={(e) => setEditingStepData({ ...editingStepData, description: e.target.value })}
                                      />
                                    </div>

                                    <div className="step-edit-row">
                                      <div className="form-group" style={{ flex: 1 }}>
                                        <label>Tipo de Acción</label>
                                        <select 
                                          className="form-input"
                                          value={editingStepData.type}
                                          onChange={(e) => setEditingStepData({ ...editingStepData, type: e.target.value })}
                                        >
                                          <option value="manual">Paso Manual (Checkbox)</option>
                                          <option value="digital">Acción Digital (Archivo)</option>
                                        </select>
                                      </div>
                                      <div className="form-group" style={{ flex: 2 }}>
                                        <label>Mensaje Motivador (Diseño Emocional)</label>
                                        <input 
                                          type="text" 
                                          className="form-input" 
                                          value={editingStepData.motivation}
                                          onChange={(e) => setEditingStepData({ ...editingStepData, motivation: e.target.value })}
                                        />
                                      </div>
                                    </div>

                                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                                      <label style={{ fontWeight: 600 }}>Responsable Asignado a este Paso</label>
                                      <select
                                        className="form-input"
                                        value={editingStepData.assignedTo || ''}
                                        onChange={(e) => setEditingStepData({ ...editingStepData, assignedTo: e.target.value })}
                                      >
                                        <option value="">-- Sin asignar (Nadie) --</option>
                                        {teamMembers.map(m => (
                                          <option key={m.id} value={m.id}>
                                            {m.name} ({m.role}) - {m.department || 'Sin Área'}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                      <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => setEditingStepIndex(null)}
                                      >
                                        Cancelar
                                      </button>
                                      <button 
                                        type="button" 
                                        className="btn btn-primary"
                                        onClick={() => {
                                          handleUpdateStep(activeTemplate.id, idx, editingStepData);
                                          setEditingStepIndex(null);
                                        }}
                                      >
                                        Guardar Paso
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Standard Step View with action buttons */
                                  <div>
                                    <div className="step-card-header">
                                      <div>
                                        <h4>{step.title}</h4>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                          Límite estimado: {step.durationLabel} (+{step.relativeOffsetDays}d)
                                        </span>
                                      </div>
                                      
                                      <div className="step-action-header">
                                        <span className={`badge ${step.type === 'digital' ? 'success' : ''}`} style={{ marginRight: '0.5rem' }}>
                                          {step.type === 'digital' ? 'Acción Digital' : 'Paso Manual'}
                                        </span>
                                        
                                        <button 
                                          className="step-action-btn"
                                          title="Editar paso"
                                          onClick={() => {
                                            setEditingStepIndex(idx);
                                            setEditingStepData(step);
                                          }}
                                        >
                                          ✏️
                                        </button>
                                        <button 
                                          className="step-action-btn delete"
                                          title="Borrar paso"
                                          onClick={() => handleDeleteStep(activeTemplate.id, idx)}
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                    <p>{step.description}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                      <div className="step-motivation">💡 {step.motivation}</div>
                                      {step.assignedTo && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', background: '#f5f3f0', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                                          {(() => {
                                            const member = teamMembers.find(m => m.id === step.assignedTo);
                                            return member ? (
                                              <>
                                                <img src={member.avatar} alt={member.name} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
                                                <span>Asignado a: <strong>{member.name}</strong> ({member.role})</span>
                                              </>
                                            ) : <span>Asignado</span>;
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        <button 
                          className="btn btn-secondary"
                          style={{ width: '100%', marginTop: '1rem', border: '2px dashed var(--color-primary)', color: 'var(--color-primary)', background: 'none' }}
                          onClick={() => handleAddStep(activeTemplate.id)}
                        >
                          ➕ Agregar Nuevo Paso
                        </button>
                      </div>
                    ) : (
                      /* Matrix Team Assignation View — Si/No Toggle */
                      <div className="team-assignment-matrix" style={{ padding: '0.5rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                          Activa o desactiva con el toggle cada paso donde el miembro interviene. Luego presiona <strong>Confirmar</strong> para guardar los cambios.
                        </p>

                        {teamMembers.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ fontStyle: 'italic' }}>No hay miembros de equipo registrados. Ve a la pestaña de "Equipo" para agregarlos.</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {teamMembers.map(member => {
                              const draftSteps = draftAssignment[member.id] || [];
                              const isInvolved = draftSteps.length > 0;

                              return (
                                <div
                                  key={member.id}
                                  style={{
                                    border: `1px solid ${isInvolved ? 'rgba(var(--color-primary-rgb),0.3)' : 'rgba(0,0,0,0.08)'}`,
                                    borderRadius: '14px',
                                    padding: '1.25rem',
                                    background: isInvolved ? 'rgba(var(--color-primary-rgb),0.03)' : 'var(--card-bg)',
                                    transition: 'all 0.25s ease'
                                  }}
                                >
                                  {/* Member Header */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                                    <img
                                      src={member.avatar}
                                      alt={member.name}
                                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(var(--color-primary-rgb),0.2)' }}
                                    />
                                    <div style={{ flexGrow: 1 }}>
                                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{member.name}</h4>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {member.role}{member.department ? ` · ${member.department}` : ''}
                                      </span>
                                    </div>
                                    {isInvolved && (
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(var(--color-primary-rgb),0.1)', padding: '2px 10px', borderRadius: '99px' }}>
                                        {draftSteps.length} paso{draftSteps.length !== 1 ? 's' : ''} asignado{draftSteps.length !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>

                                  {/* Step Toggles */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                                    {activeTemplate.steps.map((step, sIdx) => {
                                      const isOn = draftSteps.includes(sIdx);
                                      // Check if another member owns this step in the DRAFT
                                      const ownedByOther = teamMembers.find(m =>
                                        m.id !== member.id &&
                                        (draftAssignment[m.id] || []).includes(sIdx)
                                      );

                                      return (
                                        <div
                                          key={sIdx}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.6rem 0.9rem',
                                            borderRadius: '10px',
                                            background: isOn ? 'rgba(var(--color-primary-rgb),0.07)' : 'rgba(0,0,0,0.025)',
                                            opacity: ownedByOther ? 0.55 : 1,
                                            transition: 'background 0.2s'
                                          }}
                                        >
                                          <span style={{ fontSize: '0.875rem' }}>
                                            <strong style={{ marginRight: '6px', color: 'var(--color-primary)' }}>Paso {sIdx + 1}</strong>
                                            {step.title}
                                            {ownedByOther && (
                                              <em style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                                (ya asignado a {ownedByOther.name})
                                              </em>
                                            )}
                                          </span>

                                          {/* Si / No toggle pill */}
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
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '0',
                                              border: 'none',
                                              borderRadius: '99px',
                                              padding: '0',
                                              cursor: ownedByOther ? 'not-allowed' : 'pointer',
                                              background: 'none',
                                              flexShrink: 0
                                            }}
                                          >
                                            <span
                                              style={{
                                                padding: '4px 12px',
                                                borderRadius: '99px 0 0 99px',
                                                fontWeight: 700,
                                                fontSize: '0.78rem',
                                                background: isOn ? 'var(--color-primary)' : 'rgba(0,0,0,0.07)',
                                                color: isOn ? '#fff' : 'var(--text-muted)',
                                                transition: 'all 0.2s'
                                              }}
                                            >Sí</span>
                                            <span
                                              style={{
                                                padding: '4px 12px',
                                                borderRadius: '0 99px 99px 0',
                                                fontWeight: 700,
                                                fontSize: '0.78rem',
                                                background: !isOn ? '#ef4444' : 'rgba(0,0,0,0.07)',
                                                color: !isOn ? '#fff' : 'var(--text-muted)',
                                                transition: 'all 0.2s'
                                              }}
                                            >No</span>
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Confirmar Button */}
                                  <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', marginTop: '0.25rem' }}
                                    onClick={async () => {
                                      // Build updated steps: clear this member from all steps, then re-assign draftSteps
                                      const newSteps = activeTemplate.steps.map((s, sIdx) => {
                                        if (s.assignedTo === member.id) {
                                          // Remove existing assignment for this member
                                          return { ...s, assignedTo: draftSteps.includes(sIdx) ? member.id : '' };
                                        }
                                        if (draftSteps.includes(sIdx) && !s.assignedTo) {
                                          // Assign to this member if step was unowned
                                          return { ...s, assignedTo: member.id };
                                        }
                                        return s;
                                      });
                                      await saveTemplate({ ...activeTemplate, steps: newSteps });
                                    }}
                                  >
                                    ✅ Confirmar asignación de {member.name}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'team' ? (
            /* Team Tab View */
            <div>
              <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)', margin: 0 }}>
                  Equipo de Trabajo
                </h2>
                <button className="btn btn-primary" onClick={() => {
                  setEditingMember(null);
                  setMemberFormData({ name: '', role: '', email: '', avatar: '', assignedProcesses: [], department: '', managerId: '', geminiApiKey: '' });
                  setShowMemberModal(true);
                }}>
                  ➕ Agregar Personal
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                Gestiona el personal, define sus cargos y asigna los procesos operativos bajo su responsabilidad directa.
              </p>

              {teamMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <Users size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
                  <h3>No hay personal registrado</h3>
                  <p>Agrega el primer miembro de tu equipo de trabajo para empezar a asignar responsabilidades.</p>
                </div>
              ) : (
                <div className="team-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                  {teamMembers.map(member => (
                    <div key={member.id} className="team-card" style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                          <img 
                            src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} 
                            alt={member.name} 
                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                          />
                          <div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{member.name}</h4>
                            <span className="badge" style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', marginTop: '2px', display: 'inline-block' }}>
                              {member.role}
                            </span>
                          </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          📧 {member.email}
                        </p>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          🏢 <strong>Área:</strong> {member.department || 'Sin especificar'}
                        </div>
                        {member.managerId && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            👤 <strong>Jefe Directo:</strong> {(() => {
                              const mgr = teamMembers.find(m => m.id === member.managerId);
                              return mgr ? mgr.name : 'N/A';
                            })()}
                          </div>
                        )}
                        <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                          <strong>Procesos Asignados:</strong>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {member.assignedProcesses && member.assignedProcesses.length > 0 ? (
                              member.assignedProcesses.map(pid => {
                                const t = templates.find(temp => temp.id === pid);
                                return (
                                  <span key={pid} className="badge primary" style={{ fontSize: '0.7rem' }}>
                                    {t ? t.title : pid}
                                  </span>
                                );
                              })
                            ) : (
                              <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Ninguno</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid #f5f3f0', paddingTop: '0.75rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                          setEditingMember(member);
                          setMemberFormData({ name: member.name, role: member.role, email: member.email, avatar: member.avatar, assignedProcesses: member.assignedProcesses || [], department: member.department || '', managerId: member.managerId || '', geminiApiKey: member.geminiApiKey || '' });
                          setShowMemberModal(true);
                        }}>
                          Editar
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', color: '#d32f2f' }} onClick={() => handleDeleteMember(member.id)}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Settings Tab View (activeTab === 'settings') */
            <div>
              <div className="section-title">
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)', margin: 0 }}>
                  ⚙️ Configuración del Sistema
                </h2>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                Administra los detalles de tu cuenta personal, la información general de la empresa y la gestión de usuarios con sus respectivos roles de acceso.
              </p>

              {settingsSuccessMsg && (
                <div style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                  {settingsSuccessMsg}
                </div>
              )}
              {settingsErrorMsg && (
                <div style={{ backgroundColor: '#FFEBEE', color: '#D32F2F', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                  {settingsErrorMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                
                {/* Form 1: Profile Details */}
                <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Mi Perfil</h3>
                  <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Nombre Completo</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={profileFormData.name} 
                        onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Correo Electrónico</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        value={profileFormData.email} 
                        onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Nueva Contraseña (dejar vacío para mantener actual)</label>
                      <input 
                        type="password" 
                        className="form-input" 
                        placeholder="••••••••" 
                        value={profileFormData.password} 
                        onChange={(e) => setProfileFormData({ ...profileFormData, password: e.target.value })} 
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                      Actualizar Perfil
                    </button>
                  </form>
                </div>

                {/* Form 2: Organization Name */}
                <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Detalles de la Empresa</h3>
                  <form onSubmit={handleUpdateOrg} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Nombre de la Organización</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={orgFormData.name} 
                        onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })} 
                        required 
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                      Actualizar Empresa
                    </button>
                  </form>
                  <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f9f9fb', borderRadius: '8px', border: '1px solid #eef' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Resumen de Roles de la Cuenta:</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <li><strong>Admin:</strong> Control total, ve todos los procesos, plantillas y configuraciones.</li>
                      <li><strong>Agente:</strong> Colabora en el equipo, ve procesos y plantillas, pero no modifica configuraciones.</li>
                      <li><strong>Invitado:</strong> Clientes o proveedores. Límite de 10 por empresa. Solo ven ejecuciones en las que participan.</li>
                    </ul>
                  </div>
                </div>

              </div>

              {/* User management list */}
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Gestión de Usuarios</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Administradores, Agentes e Invitados registrados.
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setAddUserError('');
                      setNewUserFormData({ name: '', email: '', password: '', role: 'agent' });
                      setShowAddUserModal(true);
                    }}
                  >
                    ➕ Invitar / Registrar Usuario
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Nombre</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Rol</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgUsers.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{u.name}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                          <td style={{ padding: '1rem' }}>
                            <span 
                              className={`badge ${u.role === 'admin' ? 'primary' : u.role === 'agent' ? 'info' : 'success'}`} 
                              style={{ textTransform: 'capitalize', fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                            >
                              {u.role === 'admin' ? 'Administrador' : u.role === 'agent' ? 'Agente' : 'Invitado'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            {u.id === user?.id ? (
                              <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>Tú</span>
                            ) : (
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#d32f2f' }}
                                onClick={() => handleDeleteOrgUser(u.id)}
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span>Total Invitados: <strong>{orgUsers.filter(u => u.role === 'guest').length} / 10</strong></span>
                  {orgUsers.filter(u => u.role === 'guest').length >= 10 && (
                    <span style={{ color: '#d32f2f', fontWeight: 600 }}>⚠️ Límite de invitados alcanzado</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Operations Panel */}
        {activeTab !== 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* Uploader / Template Creator */}
            <div className="card-section">
              <h3 className="section-title">Crear Plantilla con IA</h3>
              
              {!apiKey && (
                <div className="warning-alert" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} />
                  <span>Modo Simulación. Configura tu API Key de Gemini en la parte superior.</span>
                </div>
              )}

              <div className="upload-zone" style={{ position: 'relative' }}>
                <input 
                  type="file" 
                  id="main-uploader" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  accept=".txt,.md,.json,.pdf,.docx"
                />
                <label htmlFor="main-uploader" style={{ cursor: 'pointer', display: 'block' }}>
                  <div className="upload-icon-container">
                    <Upload size={28} />
                  </div>
                  <h3>Sube un archivo de proceso</h3>
                  <p>Formatos sugeridos: .pdf, .docx, .txt, .md</p>
                </label>

                {isUploading && (
                  <div className="parsing-overlay">
                    <div className="spinner" />
                    <p style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{uploadStatusMsg}</p>
                    <div className="parsing-progress">
                      <div className="parsing-bar" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="divider">O pega las pautas directamente</div>

              <form onSubmit={handleManualSubmit}>
                <textarea 
                  className="textarea-input"
                  placeholder="Ejemplo: Proceso de Onboarding. Día 1: Kickoff inicial. Día 2: Subir identificación (digital). Día 3: Firma de contrato de confidencialidad."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  disabled={isUploading}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={isUploading || !manualText.trim()}
                >
                  <Sparkles size={16} />
                  {apiKey ? "Generar Plantilla con Gemini" : "Generar Plantilla Simulada"}
                </button>
              </form>
            </div>

            {/* List based on active tab */}
            <div className="card-section">
              {activeTab === 'instances' ? (
                <div>
                  <h3 className="section-title">Ejecuciones Activas</h3>
                  <div className="process-list">
                    {instances.map(inst => {
                      const total = inst.steps.length;
                      const completed = inst.steps.filter(s => s.isCompleted).length;
                      const percentage = Math.round((completed / total) * 100) || 0;
                      const isOverdue = checkOverdueSteps(inst);

                      return (
                        <div 
                          key={inst.id}
                          className={`process-card ${inst.id === selectedInstanceId ? 'active' : ''}`}
                          onClick={() => setSelectedInstanceId(inst.id)}
                          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                        >
                          <div className="process-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 'bold' }}>{inst.instanceName}</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.1rem' }}>{inst.companionAvatar}</span>
                              <button 
                                onClick={(e) => deleteInstance(inst.id, e)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="process-meta" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span className="badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                              {inst.category}
                            </span>
                            {isOverdue && (
                              <span className="overdue-badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                                ⚠️ Demorado
                              </span>
                            )}
                          </div>

                          <div className="process-progress-container">
                            <div className="progress-bar-bg">
                              <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="progress-percent">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : activeTab === 'templates' ? (
                <div>
                  <h3 className="section-title">Plantillas Disponibles</h3>
                  <div className="process-list">
                    {templates.map(temp => (
                      <div 
                        key={temp.id}
                        className={`process-card ${temp.id === selectedTemplateId ? 'active' : ''}`}
                        onClick={() => setSelectedTemplateId(temp.id)}
                      >
                        <div className="process-card-header">
                          <h4>{temp.title}</h4>
                          <span style={{ fontSize: '1.25rem' }}>{temp.companionAvatar}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          {temp.description ? (temp.description.length > 70 ? temp.description.substring(0, 70) + '...' : temp.description) : ''}
                        </p>
                        <span className="badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                          {temp.category || 'General'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="section-title">Resumen de Tareas</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Los miembros de tu equipo están asignados a tareas operativas específicas. Las notificaciones se enviarán automáticamente a sus correos cuando sus tareas se activen.
                  </p>
                </div>
              )}
            </div>

            {/* Real-time Overdue Notification Logs Drawer */}
            <div className="notification-panel">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} style={{ color: '#D32F2F' }} /> Registro de Notificaciones Enviadas
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Historial de alertas por atraso de plazos enviadas a los responsables.
              </p>
              <div className="notification-list">
                {notificationLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No hay notificaciones de retraso por el momento. ¡Todo va en tiempo! ☀️
                  </div>
                ) : (
                  notificationLogs.map(log => (
                    <div key={log.id} className="notification-item">
                      <div>
                        <strong>{log.instanceName}</strong>
                        <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}>{log.message}</div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Start Execution Modal */}
      {showLaunchModal && (
        <div className="modal-overlay" onClick={() => { setShowLaunchModal(false); setLaunchModalStep(1); }}>
          <form className="modal-card" style={{ maxWidth: '480px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onSubmit={e => {
            if (launchModalStep < 2) {
              e.preventDefault();
              if (!activeTemplate && !launchTemplateId) {
                alert("Por favor selecciona una plantilla.");
                return;
              }
              if (!launchInstanceName.trim()) {
                alert("Por favor introduce el nombre de la ejecución.");
                return;
              }
              setLaunchModalStep(2);
            } else {
              handleLaunchInstance(e);
            }
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-color)', margin: 0 }}>
                🚀 Iniciar Proceso
              </h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(26, 115, 232, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '50px' }}>
                Paso {launchModalStep} de 2
              </span>
            </div>

            {/* Stepper Progress Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: 'var(--color-primary)' }} />
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: launchModalStep >= 2 ? 'var(--color-primary)' : 'rgba(0,0,0,0.06)' }} />
            </div>

            {launchModalStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(activeTemplate || templates.find(t => t.id === launchTemplateId)) ? (
                  <div style={{ backgroundColor: 'var(--bg-light)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)', fontSize: '0.85rem' }}>
                    Plantilla: <strong>{(activeTemplate || templates.find(t => t.id === launchTemplateId))?.title}</strong>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Selecciona y personaliza la plantilla que vas a ejecutar a continuación.
                  </p>
                )}

                {/* Template picker — only shown when not launched from a template detail */}
                {!activeTemplate && (
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Plantilla de Proceso *</label>
                    <select
                      className="form-input"
                      value={launchTemplateId}
                      onChange={e => setLaunchTemplateId(e.target.value)}
                      required
                    >
                      <option value="">-- Selecciona una plantilla --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.companionAvatar} {t.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Nombre de la ejecución (Caso / Cliente / Empleado) *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. Onboarding - Juan Pérez"
                    value={launchInstanceName}
                    onChange={(e) => setLaunchInstanceName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            {launchModalStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Define cuándo iniciará el proceso. Los plazos de cada paso se programarán automáticamente a partir de esta fecha.
                </p>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Fecha de Inicio del Proceso *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={launchStartDate}
                    onChange={(e) => setLaunchStartDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  if (launchModalStep > 1) {
                    setLaunchModalStep(1);
                  } else {
                    setShowLaunchModal(false);
                  }
                }}
              >
                {launchModalStep > 1 ? 'Atrás' : 'Cancelar'}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
              >
                {launchModalStep === 2 ? '✅ Crear Proceso Vivo' : 'Siguiente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete Celebration Modal */}
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-modal">
            <div className="celebration-emoji">🎉✨🏆</div>
            <h2>¡Súper Hazaña Lograda!</h2>
            <p>{celebrationMsg}</p>
            <button className="celebration-btn" onClick={() => setShowCelebration(false)}>
              ¡Continuar con Alegría!
            </button>
          </div>
        </div>
      )}

      {/* Team Member Add/Edit Modal */}
      {showMemberModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => { setShowMemberModal(false); setMemberModalStep(1); setEditingMember(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-color)', margin: 0 }}>
                {editingMember ? '📝 Editar Colaborador' : '👥 Nuevo Colaborador'}
              </h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(26, 115, 232, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '50px' }}>
                Paso {memberModalStep} de 3
              </span>
            </div>

            {/* Stepper Progress Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: 'var(--color-primary)' }} />
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: memberModalStep >= 2 ? 'var(--color-primary)' : 'rgba(0,0,0,0.06)' }} />
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: memberModalStep >= 3 ? 'var(--color-primary)' : 'rgba(0,0,0,0.06)' }} />
            </div>

            <form onSubmit={e => {
              if (memberModalStep < 3) {
                e.preventDefault();
                if (memberModalStep === 1) {
                  if (!memberFormData.name || !memberFormData.email) {
                    alert("Por favor completa los campos obligatorios del Paso 1.");
                    return;
                  }
                } else if (memberModalStep === 2) {
                  if (!memberFormData.role || !memberFormData.department) {
                    alert("Por favor completa los campos obligatorios del Paso 2.");
                    return;
                  }
                }
                setMemberModalStep(prev => prev + 1);
              } else {
                handleSaveMember(e);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {memberModalStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Nombre Completo *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={memberFormData.name} 
                      onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })} 
                      required 
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Correo Electrónico *</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={memberFormData.email} 
                      onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })} 
                      required 
                    />
                  </div>
                </div>
              )}

              {memberModalStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Cargo / Rol *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej. Diseñadora de UI, Director de Operaciones" 
                      value={memberFormData.role} 
                      onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value })} 
                      required 
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Departamento / Área *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej. Operaciones, Tecnología, Finanzas"
                      value={memberFormData.department || ''} 
                      onChange={(e) => setMemberFormData({ ...memberFormData, department: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Jefe Directo (Opcional)</label>
                    <select
                      className="form-input"
                      value={memberFormData.managerId || ''}
                      onChange={(e) => setMemberFormData({ ...memberFormData, managerId: e.target.value })}
                    >
                      <option value="">-- Sin jefe directo --</option>
                      {teamMembers
                        .filter(m => !editingMember || m.id !== editingMember.id)
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              )}

              {memberModalStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Flujos y Procesos Asignados</label>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Selecciona las plantillas en las que participa este colaborador para agilizar la asignación.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.08)', padding: '10px', borderRadius: '8px' }}>
                      {templates.map(temp => {
                        const isChecked = memberFormData.assignedProcesses?.includes(temp.id);
                        return (
                          <label key={temp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', padding: '4px 0' }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={(e) => {
                                const newAssigned = e.target.checked 
                                  ? [...(memberFormData.assignedProcesses || []), temp.id]
                                  : (memberFormData.assignedProcesses || []).filter(id => id !== temp.id);
                                setMemberFormData({ ...memberFormData, assignedProcesses: newAssigned });
                              }}
                            />
                            {temp.title}
                          </label>
                        );
                      })}
                      {templates.length === 0 && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No hay plantillas de procesos disponibles.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    if (memberModalStep > 1) {
                      setMemberModalStep(prev => prev - 1);
                    } else {
                      setShowMemberModal(false);
                      setEditingMember(null);
                    }
                  }}
                >
                  {memberModalStep > 1 ? 'Atrás' : 'Cancelar'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {memberModalStep === 3 ? 'Guardar Miembro' : 'Siguiente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => { setShowAddUserModal(false); setAddUserModalStep(1); }}>
          <form className="modal-card" style={{ maxWidth: '450px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onSubmit={e => {
            if (addUserModalStep < 2) {
              e.preventDefault();
              if (!newUserFormData.name || !newUserFormData.email) {
                alert("Por favor completa los campos obligatorios del Paso 1.");
                return;
              }
              setAddUserModalStep(2);
            } else {
              handleAddOrgUser(e);
            }
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-color)', margin: 0 }}>
                👤 Registrar Nuevo Usuario
              </h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(26, 115, 232, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '50px' }}>
                Paso {addUserModalStep} de 2
              </span>
            </div>

            {/* Stepper Progress Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: 'var(--color-primary)' }} />
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: addUserModalStep >= 2 ? 'var(--color-primary)' : 'rgba(0,0,0,0.06)' }} />
            </div>

            {addUserError && (
              <div style={{ backgroundColor: '#FFEBEE', color: '#D32F2F', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {addUserError}
              </div>
            )}

            {addUserModalStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Nombre Completo *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newUserFormData.name} 
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, name: e.target.value })} 
                    required 
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Correo Electrónico *</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={newUserFormData.email} 
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, email: e.target.value })} 
                    required 
                  />
                </div>
              </div>
            )}

            {addUserModalStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Contraseña Temporal *</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={newUserFormData.password} 
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, password: e.target.value })} 
                    required 
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Rol del Usuario *</label>
                  <select
                    className="form-input"
                    value={newUserFormData.role}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, role: e.target.value })}
                    required
                  >
                    <option value="agent">Agente (Miembro de equipo)</option>
                    <option value="guest">Invitado (Cliente o Proveedor)</option>
                  </select>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Los invitados tienen un límite estricto de hasta 10 por empresa.
                  </small>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  if (addUserModalStep > 1) {
                    setAddUserModalStep(1);
                  } else {
                    setShowAddUserModal(false);
                  }
                }}
              >
                {addUserModalStep > 1 ? 'Atrás' : 'Cancelar'}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
              >
                {addUserModalStep === 2 ? 'Crear Usuario' : 'Siguiente'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
