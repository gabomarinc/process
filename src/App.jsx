import { LaunchExecutionModal } from "./components/ui/LaunchExecutionModal";
import { SuccessTicketModal } from "./components/ui/SuccessTicketModal";
import { TemplateWizardModal } from "./components/ui/TemplateWizardModal";
import { TemplatePreviewModal } from "./components/ui/TemplatePreviewModal";
import { MemberModal } from "./components/ui/MemberModal";
import { AddUserModal } from "./components/ui/AddUserModal";
import { TemplateDetailsModal } from "./components/ui/TemplateDetailsModal";
import { ActiveExecutionModal } from "./components/ui/ActiveExecutionModal";
import { OnDemandModal } from "./components/ui/OnDemandModal";
import { LandingPage } from "./components/ui/LandingPage";
import { DestinationCard } from "./components/ui/DestinationCard";
import "./App.css";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { useAlert } from './contexts/AlertContext';
import Notifications from './components/ui/notifications';
import React, { useState, useEffect } from 'react';
import { 
  mockProcesses as initialTemplates 
} from './data/mockData';
import { 
  Upload, 
  Sparkles, 
  Calendar, 
  Smile, 
  MessageSquare,
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
  Users,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Lock,
  ListTodo,
  HelpCircle,
  Save,
  Mic,
  Building, Rocket, Globe, Laptop, TrendingUp, Handshake, Wrench, Gem,
  Bot, Trophy, Heart, Plus, Mail, Edit, CheckCircle, Lightbulb, PartyPopper, User, Settings, LayoutGrid
} from 'lucide-react';

let modifiedTemplateIds = new Set();

const flagsList = [<Building size={18}/>, <Rocket size={18}/>, <Globe size={18}/>, <Laptop size={18}/>, <TrendingUp size={18}/>, <Handshake size={18}/>, <Wrench size={18}/>, <Gem size={18}/>];
const colorsList = ['210 70% 40%', '170 70% 35%', '340 70% 40%', '250 70% 35%', '280 70% 40%', '30 70% 40%', '120 70% 30%'];
const imagesList = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=600'
];

const getClientDisplay = (client, idx) => {
  if (!client) return null;
  return {
    id: client.id,
    name: client.name,
    flag: flagsList[idx % flagsList.length],
    themeColor: colorsList[idx % colorsList.length],
    imageUrl: imagesList[idx % imagesList.length]
  };
};

const getClientForInstance = (instance, clientsData = []) => {
  if (!instance || !instance.instanceName) return null;
  const nameLower = instance.instanceName.toLowerCase();
  const found = clientsData.find(c => 
    nameLower.includes(c.name.toLowerCase()) || 
    c.name.toLowerCase().includes(nameLower)
  );
  return found ? found.id : null;
};

function App() {
  const showAlert = useAlert();


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
      setShowAuthScreen(true);
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

  useEffect(() => {
    // Automatically ask for permission if not set yet and user is logged in
    if (user && "Notification" in window && Notification.permission === 'default' && localStorage.getItem('browser_notifications_enabled') === null) {
      const timer = setTimeout(() => {
        showAlert('Habilita las notificaciones para recibir actualizaciones en tiempo real sobre tus procesos.', 'information', 'Activar Notificaciones', {
          label: 'Permitir',
          onClick: async () => {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              setBrowserNotifications(true);
              localStorage.setItem('browser_notifications_enabled', 'true');
              showAlert("Notificaciones de Kônsul activadas con éxito.", 'success', 'Kônsul');
            } else {
              localStorage.setItem('browser_notifications_enabled', 'false');
            }
          }
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, showAlert]);

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'gerente') {
      setDashboardViewMode('focus');
    }
  }, [user]);

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
  const [selectedClientFilter, setSelectedClientFilter] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [clients, setClients] = useState([]);

  // Team Management states
  const [teamMembers, setTeamMembers] = useState([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [ticketModal, setTicketModal] = useState({ isOpen: false, title: "", message: "", ticketId: "", customFields: [] });
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = React.useRef(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showOnDemandModal, setShowOnDemandModal] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState({});
  const [editingMember, setEditingMember] = useState(null);
  const [memberFormData, setMemberFormData] = useState({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '', systemRole: '' });
  const [fileStore, setFileStore] = useState({});
  const [clickupToken, setClickupToken] = useState('');
  const [clickupRules, setClickupRules] = useState([]);
  const [newClickupRule, setNewClickupRule] = useState({ ruleName: '', clickupListId: '', clickupListName: '', clickupStatus: '', templateId: '' });
  const [isTestingClickup, setIsTestingClickup] = useState(false);
  const [clickupConnectionStatus, setClickupConnectionStatus] = useState(null);
  const [ecosystemSubTab, setEcosystemSubTab] = useState('oficiales'); // 'oficiales' or 'ondemand'
  const [showClickupModal, setShowClickupModal] = useState(false);
  
  // ClickUp Integration Dynamic Selectors
  const [clickupTeams, setClickupTeams] = useState([]);
  const [selectedClickupTeamId, setSelectedClickupTeamId] = useState('');
  const [clickupSpaces, setClickupSpaces] = useState([]);
  const [selectedClickupSpaceId, setSelectedClickupSpaceId] = useState('');
  const [clickupFolders, setClickupFolders] = useState([]);
  const [clickupFolderlessLists, setClickupFolderlessLists] = useState([]);
  const [selectedClickupFolderId, setSelectedClickupFolderId] = useState(''); // can be 'folderless'
  const [clickupLists, setClickupLists] = useState([]);
  const [selectedClickupListId, setSelectedClickupListId] = useState('');
  const [clickupStatuses, setClickupStatuses] = useState([]);
  const [isLoadingClickupData, setIsLoadingClickupData] = useState(false);
  const [configuringRule, setConfiguringRule] = useState(null);
  const [showConfigureRuleModal, setShowConfigureRuleModal] = useState(false);
  const [dashboardViewMode, setDashboardViewMode] = useState('focus'); // 'focus' or 'birds-eye'
  const [chatTemplateId, setChatTemplateId] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };
  const [browserNotifications, setBrowserNotifications] = useState(() => {
    return localStorage.getItem('browser_notifications_enabled') === 'true';
  });

  const triggerBrowserNotification = (msg) => {
    showAlert(msg, 'information', 'Notificación Kônsul');
    if (localStorage.getItem('browser_notifications_enabled') === 'true' && "Notification" in window && Notification.permission === 'granted') {
      new Notification("Kônsul", {
        body: msg,
        icon: '/favicon.ico'
      });
    }
  };

  // Modal / Form States
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchInstanceName, setLaunchInstanceName] = useState('');
  const [launchStartDate, setLaunchStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [launchTemplateId, setLaunchTemplateId] = useState(''); // template selected inside the launch modal

  // Stepper steps tracking
  const [memberModalStep, setMemberModalStep] = useState(1);
  const [expandedTeamTemplates, setExpandedTeamTemplates] = useState({});
  const [expandedTemplateMembers, setExpandedTemplateMembers] = useState({});
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

  // SMTP & IMAP/POP credentials state (stateless client storage)
  const [smtpSettings, setSmtpSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('smtp_settings')) || { smtpHost: '', smtpPort: '465', smtpUser: '', smtpPass: '' };
    } catch {
      return { smtpHost: '', smtpPort: '465', smtpUser: '', smtpPass: '' };
    }
  });

  const [imapSettings, setImapSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('imap_settings')) || { imapHost: '', imapPort: '993', imapSecure: true };
    } catch {
      return { imapHost: '', imapPort: '993', imapSecure: true };
    }
  });

  const [emailTestStatus, setEmailTestStatus] = useState(null);

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
  const [profileFormData, setProfileFormData] = useState({ name: '', email: '', password: '', companionName: '', companionAvatar: '' });
  const [orgFormData, setOrgFormData] = useState({ name: '' });
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');
  const [settingsErrorMsg, setSettingsErrorMsg] = useState('');

  // Unified Navbar States
  const [openDropdown, setOpenDropdown] = useState(null); // null, 'procesos', 'cuenta'
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);


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


        const logsRes = await fetch('/api/notifications');
        const logsData = await logsRes.json();
        setNotificationLogs(logsData);

        const teamRes = await fetch('/api/team');
        const teamData = await teamRes.json();
        setTeamMembers(teamData);

        const clientsRes = await fetch('/api/clients');
        const clientsData = await clientsRes.json();
        setClients(clientsData);

        // Fetch users and organization details
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setProfileFormData({ 
            name: parsed.name, 
            email: parsed.email, 
            password: '', 
            companionName: parsed.companionName || '', 
            companionAvatar: parsed.companionAvatar || '' 
          });

          // Fetch organization details for ALL users to load the shared Gemini API Key
          const orgRes = await fetch('/api/organization');
          if (orgRes.ok) {
            const orgData = await orgRes.json();
            setOrgFormData({ name: orgData.name });
            if (orgData.gemini_api_key) {
              setApiKey(orgData.gemini_api_key);
              setTempKey(orgData.gemini_api_key);
            }
          }

          // Fetch ClickUp Settings and Rules
          const clickupRes = await fetch('/api/organization/clickup');
          if (clickupRes.ok) {
            const clickupData = await clickupRes.json();
            setClickupToken(clickupData.clickupToken || '');
          }
          const clickupRulesRes = await fetch('/api/integrations/clickup/rules');
          if (clickupRulesRes.ok) {
            const clickupRulesData = await clickupRulesRes.json();
            setClickupRules(clickupRulesData);
          }

          if (parsed.role === 'admin') {
            const usersRes = await fetch('/api/users');
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setOrgUsers(usersData);
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
                message: `RETRASO: El paso "${step.title}" venció el ${dueDate.toLocaleDateString()}. Notificaciones enviadas al equipo de ${inst.category}.`,
                type: 'alert'
              };

              // Local state update
              setNotificationLogs(prev => [
                { ...newLog, time: new Date().toISOString() },
                ...prev
              ]);
              triggerBrowserNotification(newLog.message);

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

  const handleAssignStepMember = async (instanceId, stepId, assignedTo) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) return;
    const updatedSteps = inst.steps.map(s => {
      if (s.id !== stepId) return s;
      return { ...s, assignedTo: assignedTo };
    });
    setInstances(prev => prev.map(i => i.id === instanceId ? { ...i, steps: updatedSteps } : i));
    try {
      await fetch(`/api/instances/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: updatedSteps })
      });
    } catch (err) {
      console.error("Error al asignar responsable en Neon:", err);
    }
  };

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

    // Trigger progress notification (for completion)
    if (isCompleted) {
      const completedStep = updatedSteps.find(s => s.id === stepId);
      if (completedStep) {
        const completeLogId = `complete-${instanceId}-${stepId}`;
        const completedIndex = updatedSteps.findIndex(s => s.id === stepId);
        const nextStep = updatedSteps[completedIndex + 1];
        let progressMessage = `Avance: ${user?.name || 'Un compañero'} completó el paso "${completedStep.title}" en "${inst.instanceName}".`;
        if (nextStep && nextStep.assignedTo) {
          const nextAssignee = teamMembers.find(m => String(m.id) === String(nextStep.assignedTo));
          if (nextAssignee) {
            progressMessage = `${user?.name || 'Un compañero'} completó el paso "${completedStep.title}" en "${inst.instanceName}" y se lo pasó a ${nextAssignee.name}. @${nextAssignee.name}, te toca.`;
          }
        }
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: completeLogId,
              instanceId,
              stepId,
              instanceName: inst.instanceName,
              stepTitle: completedStep.title,
              message: progressMessage,
              type: 'success'
            })
          });
        } catch (err) {
          console.error("Error al registrar notificacion de avance:", err);
        }
      }
    }

    // Celebration if all steps completed
    const allDone = updatedSteps.every(s => s.isCompleted);
    if (allDone && !inst.steps.every(s => s.isCompleted)) {
      setTimeout(() => {
        setCelebrationMsg(`¡Excelente! Has completado el proceso "${inst.instanceName}". Todo el equipo está al día.`);
        setShowCelebration(true);
        triggerConfetti();
      }, 300);
    } else if (isCompleted) {
      triggerConfetti();
    }
  };

  const handleUpdateStepComments = async (instanceId, stepId, comments) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) return;

    const updatedSteps = inst.steps.map(s => {
      if (s.id !== stepId) return s;
      return { ...s, comments };
    });

    setInstances(prev => prev.map(i => {
      if (i.id === instanceId) return { ...i, steps: updatedSteps };
      return i;
    }));

    try {
      await fetch(`/api/instances/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: updatedSteps })
      });
    } catch (err) {
      console.error("Error saving step comments:", err);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatTemplateId) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    const template = templates.find(t => t.id === chatTemplateId);
    const stepsContext = (template?.steps || []).map((s, i) => `Paso ${i+1}: ${s.title}. Descripción: ${s.description}.`).join('\n');

    const prompt = `Eres un consultor experto y guía del proceso llamado "${template?.title}".
Descripción del proceso: ${template?.description || 'No especificada'}.
Pasos del proceso:
${stepsContext}

El usuario tiene la siguiente pregunta o duda sobre este proceso:
"${userMsg}"

REQUISITOS OBLIGATORIOS DE RESPUESTA:
1. Responde de forma muy concisa, clara, directa y profesional. Sin introducciones, rodeos, ni textos largos de relleno. Ve directo al grano.
2. Evita adjetivos exagerados o adornos.
3. NO uses formato markdown bajo ninguna circunstancia. No utilices asteriscos (* o **) ni guiones para resaltar palabras. Usa texto plano limpio y saltos de línea estándar para separar las ideas.`;

    try {
      const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude obtener una respuesta de guía en este momento.';
      const cleanText = aiText.replace(/\*\*/g, '').replace(/\*/g, '');
      setChatMessages(prev => [...prev, { sender: 'ai', text: cleanText }]);
    } catch (err) {
      console.error("Error querying chat assistant:", err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Lo siento, hubo un error de red al consultar al asistente.' }]);
    } finally {
      setIsChatLoading(false);
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
          message,
          type: 'alert'
        };

        setNotificationLogs(prev => [newLog, ...prev]);
        triggerBrowserNotification(message);

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
      // Reload templates/instances page metadata if companion settings change
      window.location.reload();
    } catch (err) {
      setSettingsErrorMsg(err.message);
    }
  };

  const handleTestEmailConnection = async () => {
    setEmailTestStatus({ loading: true });
    try {
      const res = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...smtpSettings,
          ...imapSettings
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falló la conexión de prueba.');
      }
      setEmailTestStatus({ success: true, message: data.message });
    } catch (err) {
      setEmailTestStatus({ success: false, message: err.message });
    }
  };

  const handleSaveEmailSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('smtp_settings', JSON.stringify(smtpSettings));
    localStorage.setItem('imap_settings', JSON.stringify(imapSettings));
    setSettingsSuccessMsg('Configuración de correo electrónico guardada localmente.');
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

  const handleSaveClickupSettings = async (e) => {
    e.preventDefault();
    setSettingsSuccessMsg('');
    setSettingsErrorMsg('');
    try {
      const res = await fetch('/api/organization/clickup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clickupToken, clickupWorkspaceId: '' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la configuración de ClickUp.');
      showAlert('Configuración de ClickUp guardada con éxito.', 'success');
      loadClickupTeams();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleTestClickupConnection = async () => {
    if (!clickupToken.trim()) return;
    setIsTestingClickup(true);
    setClickupConnectionStatus(null);
    try {
      const res = await fetch('/api/integrations/clickup/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: clickupToken })
      });
      const data = await res.json();
      setIsTestingClickup(false);
      if (res.ok) {
        setClickupConnectionStatus({ success: true, message: `Conexión exitosa. Usuario: ${data.username}` });
      } else {
        setClickupConnectionStatus({ success: false, message: data.error || 'Token inválido' });
      }
    } catch (err) {
      setIsTestingClickup(false);
      setClickupConnectionStatus({ success: false, message: 'Fallo al conectar con el servidor' });
    }
  };

  const handleCreateClickupRule = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/integrations/clickup/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClickupRule)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la regla.');
      setClickupRules([data, ...clickupRules]);
      setSelectedClickupTeamId('');
      setSelectedClickupSpaceId('');
      setSelectedClickupFolderId('');
      setSelectedClickupListId('');
      setNewClickupRule({ ruleName: '', clickupListId: '', clickupListName: '', clickupStatus: '', templateId: '' });
      showAlert('Regla de automatización de ClickUp creada.', 'success');
      setShowClickupModal(false);
      setConfiguringRule({ ...data, titlePattern: data.titlePattern || '{template_title} - {task_name}' });
      setShowConfigureRuleModal(true);
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleUpdateClickupRuleConfig = async (e) => {
    e.preventDefault();
    if (!configuringRule) return;
    try {
      const res = await fetch(`/api/integrations/clickup/rules/${configuringRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titlePattern: configuringRule.titlePattern })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la regla.');
      setClickupRules(clickupRules.map(r => r.id === data.id ? data : r));
      setShowConfigureRuleModal(false);
      setConfiguringRule(null);
      showAlert('Configuración de la regla de automatización guardada correctamente.', 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleDeleteClickupRule = async (ruleId) => {
    try {
      const res = await fetch(`/api/integrations/clickup/rules/${ruleId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo eliminar la regla.');
      }
      setClickupRules(clickupRules.filter(r => r.id !== ruleId));
      showAlert('Regla eliminada correctamente.', 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  // Load ClickUp teams/workspaces
  const loadClickupTeams = async () => {
    setIsLoadingClickupData(true);
    try {
      const res = await fetch('/api/integrations/clickup/teams');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const teams = data.teams || [];
      setClickupTeams(teams);
      if (teams.length > 0) {
        setSelectedClickupTeamId(teams[0].id);
      }
    } catch (err) {
      console.error("Error al cargar equipos de ClickUp", err);
    } finally {
      setIsLoadingClickupData(false);
    }
  };

  // Load Spaces when Team changes
  useEffect(() => {
    if (!selectedClickupTeamId) {
      setClickupSpaces([]);
      return;
    }
    const loadSpaces = async () => {
      setIsLoadingClickupData(true);
      try {
        const res = await fetch(`/api/integrations/clickup/spaces?team_id=${selectedClickupTeamId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setClickupSpaces(data.spaces || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingClickupData(false);
      }
    };
    loadSpaces();
  }, [selectedClickupTeamId]);

  // Load Folders & Folderless Lists when Space changes
  useEffect(() => {
    if (!selectedClickupSpaceId) {
      setClickupFolders([]);
      setClickupFolderlessLists([]);
      return;
    }
    const loadFoldersAndLists = async () => {
      setIsLoadingClickupData(true);
      try {
        const res = await fetch(`/api/integrations/clickup/folders-and-lists?space_id=${selectedClickupSpaceId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setClickupFolders(data.folders || []);
        setClickupFolderlessLists(data.folderlessLists || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingClickupData(false);
      }
    };
    loadFoldersAndLists();
  }, [selectedClickupSpaceId]);

  // Load Lists when Folder changes
  useEffect(() => {
    if (!selectedClickupFolderId || selectedClickupFolderId === 'folderless') {
      setClickupLists([]);
      return;
    }
    const loadLists = async () => {
      setIsLoadingClickupData(true);
      try {
        const res = await fetch(`/api/integrations/clickup/lists?folder_id=${selectedClickupFolderId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setClickupLists(data.lists || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingClickupData(false);
      }
    };
    loadLists();
  }, [selectedClickupFolderId]);

  // Handle selected list change (load details / statuses)
  useEffect(() => {
    if (!selectedClickupListId) {
      setClickupStatuses([]);
      return;
    }
    const loadListDetails = async () => {
      setIsLoadingClickupData(true);
      try {
        const res = await fetch(`/api/integrations/clickup/list-details?list_id=${selectedClickupListId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const listStatuses = data.statuses || [];
        setClickupStatuses(listStatuses);
        
        // Update newClickupRule rule list name and ID
        setNewClickupRule(prev => ({
          ...prev,
          clickupListId: selectedClickupListId,
          clickupListName: data.name || '',
          clickupStatus: listStatuses.length > 0 ? listStatuses[0].status : ''
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingClickupData(false);
      }
    };
    loadListDetails();
  }, [selectedClickupListId]);

  // Load teams when modal is shown and clickupToken is active
  useEffect(() => {
    if (showClickupModal && clickupToken) {
      loadClickupTeams();
    }
  }, [showClickupModal]);

  const handleUpdateClickupRuleStatus = async (ruleId, newStatus) => {
    try {
      const res = await fetch(`/api/integrations/clickup/rules/${ruleId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo cambiar el estado de la regla.');
      }
      setClickupRules(prev => prev.map(r => r.id === ruleId ? { ...r, status: newStatus } : r));
      showAlert(`Estado de regla ClickUp cambiado a ${newStatus === 'approved' ? 'aprobada' : 'rechazada'}.`, 'success');
    } catch (err) {
      showAlert(err.message, 'error');
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
      showAlert(err.message);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el rol.');
      setOrgUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showAlert('Rol de usuario actualizado con éxito.', 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  // Save (Create/Update) team member
  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!memberFormData.name || !memberFormData.role || !memberFormData.email) {
      showAlert("Por favor completa los campos obligatorios.");
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
        
        // Update System Role if modified
        const sysUser = orgUsers.find(u => u.email?.toLowerCase() === newMember.email?.toLowerCase());
        if (sysUser && memberFormData.systemRole && memberFormData.systemRole !== sysUser.role) {
          if (user?.role === 'admin' && user?.id !== sysUser.id) {
            try {
              const roleRes = await fetch(`/api/users/${sysUser.id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: memberFormData.systemRole })
              });
              if (roleRes.ok) {
                 const data = await roleRes.json();
                 setOrgUsers(prev => prev.map(u => u.id === sysUser.id ? data.user : u));
              }
            } catch (err) {
              console.error("Error updating system role:", err);
            }
          } else if (user?.id === sysUser.id) {
             showAlert("No puedes modificar tu propio rol del sistema.");
          }
        }
        // Sync modified templates and database with the new memberId assignment
        for (const temp of templates) {
          let updatedSteps = temp.steps;
          let needsSave = modifiedTemplateIds.has(temp.id);

          // Always replace 'temp_new_member' with the actual memberId
          const mappedSteps = updatedSteps.map(step => {
            if (step.assignedTo === 'temp_new_member') {
              needsSave = true;
              return { ...step, assignedTo: memberId };
            }
            return step;
          });

          if (needsSave) {
            await saveTemplate({ ...temp, steps: mappedSteps });
          }
        }
        modifiedTemplateIds = new Set();

        setShowMemberModal(false);
        setShowEditProfileModal(false);
        setEditingMember(null);
        setMemberFormData({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '', systemRole: '' });
        setTicketModal({
          isOpen: true,
          title: "¡Perfil Guardado!",
          message: editingMember ? "Los cambios se guardaron correctamente." : "El nuevo colaborador fue añadido con éxito.",
          ticketId: editingMember ? "Edición de Equipo" : "Nuevo Miembro",
          customFields: [
            { label: "Colaborador", value: newMember.name },
            { label: "Rol", value: newMember.role }
          ]
        });
      } else {
        console.error("Error al guardar miembro del equipo");
      }
    } catch (err) {
      console.error("Error al guardar miembro del equipo:", err);
    }
  };

  // Delete team member
  
  const handleResendInvite = async (id) => {
    try {
      const res = await fetch(`/api/team/${id}/resend-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reenviar invitación.');
      showAlert("Invitación reenviada con éxito al correo del usuario.");
    } catch (err) {
      showAlert(err.message);
    }
  };

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
  const handleLaunchInstance = async (data) => {
    let templateToUse;
    let startDateTime;
    let instanceName;

    // Support both old event-based call and new data object call
    if (data && data.preventDefault) {
      data.preventDefault();
      templateToUse = activeTemplate || templates.find(t => t.id === launchTemplateId);
      if (!templateToUse || !launchInstanceName.trim()) return;
      startDateTime = new Date(launchStartDate).getTime();
      instanceName = launchInstanceName;
    } else {
      templateToUse = templates.find(t => t.id === data.templateId);
      if (!templateToUse || !data.instanceName.trim()) return;
      startDateTime = data.startDate.getTime();
      instanceName = data.instanceName;
      
      if (data.isNewClient) {
        try {
          const clientRes = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ name: instanceName })
          });
          if (clientRes.ok) {
            const newClient = await clientRes.json();
            setClients(prev => [...prev, newClient]);
          }
        } catch (err) {
          console.error("Error creating new client before launch", err);
        }
      }
    }

    
    const newInstance = {
      id: "inst_" + Date.now(),
      templateId: templateToUse.id,
      title: templateToUse.title,
      instanceName: instanceName,
      startedAt: new Date(startDateTime).toISOString(),
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

    setTicketModal({
      isOpen: true,
      title: "¡Ejecución Iniciada!",
      message: "Se ha lanzado la ejecución con éxito.",
      ticketId: "Nueva Ejecución",
      customFields: [
        { label: "Ejecución", value: newInstance.instanceName },
        { label: "Plantilla Base", value: newInstance.title }
      ]
    });
    // Trigger active assignee notification for the first step
    await checkAndNotifyActiveAssignee(newInstance, newInstance.steps);

    // Trigger launch notification for Admin
    try {
      const launchLogId = `launch-${newInstance.id}`;
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: launchLogId,
          instanceId: newInstance.id,
          stepId: 'launch',
          instanceName: newInstance.instanceName,
          stepTitle: 'Inicio de Ejecución',
          message: `Se inició la ejecución "${newInstance.instanceName}" basada en la plantilla "${newInstance.title}".`,
          type: 'message'
        })
      });
    } catch (err) {
      console.error("Error al registrar notificacion de lanzamiento:", err);
    }

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
      setSelectedInstanceId("");
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

  const handleUpdateTemplateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/templates/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
        showAlert(`Plantilla ${newStatus === 'approved' ? 'aprobada' : 'rechazada'} con éxito.`, 'success');
      } else {
        const errData = await res.json();
        showAlert(errData.error || 'Error al actualizar el estado de la plantilla.', 'error');
      }
    } catch (err) {
      console.error("Error al actualizar estado de plantilla:", err);
      showAlert('Error al conectar con el servidor.', 'error');
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
  const saveApiKey = async () => {
    try {
      const res = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgFormData.name, gemini_api_key: tempKey })
      });
      if (res.ok) {
        localStorage.setItem('gemini_api_key', tempKey);
        setApiKey(tempKey);
        setShowKeyInput(false);
      } else {
        console.error("Error al guardar API Key en el servidor");
      }
    } catch (err) {
      console.error("Error al guardar API Key:", err);
    }
  };

  const clearApiKey = async () => {
    try {
      const res = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgFormData.name, gemini_api_key: null })
      });
      if (res.ok) {
        localStorage.removeItem('gemini_api_key');
        setApiKey('');
        setTempKey('');
        setShowKeyInput(false);
      } else {
        console.error("Error al limpiar API Key en el servidor");
      }
    } catch (err) {
      console.error("Error al limpiar API Key:", err);
    }
  };

  // AI Prompt Call using fetch to v1beta gemini-flash-latest
  
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showAlert("Tu navegador no soporta el reconocimiento de voz. Te recomendamos usar Google Chrome.");
      return;
    }

    let finalTranscript = '';
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'es-ES';

    rec.onstart = () => {
      setIsRecording(true);
      setIsUploading(true);
      setUploadProgress(20);
      setUploadStatusMsg("Escuchando tu voz... Habla ahora.");
    };

    rec.onerror = (e) => {
      console.error("Speech recognition error:", e);
      setIsRecording(false);
      setIsUploading(false);
      setUploadStatusMsg("");
      if (e.error === 'not-allowed') {
        showAlert("Permiso para usar el micrófono denegado. Por favor habilítalo en tu navegador.");
      } else {
        showAlert(`Error en el micrófono o reconocimiento: ${e.error}`);
      }
    };

    rec.onend = () => {
      setIsRecording(false);
      setIsUploading(false);
      setUploadStatusMsg("");
      if (!finalTranscript.trim()) {
        showAlert("No se detectó ninguna palabra hablada. Asegúrate de hablar claramente cerca del micrófono.");
        return;
      }
      generateTemplate(finalTranscript, "Proceso por Audio");
    };

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSavePreview = async (templateData) => {
    try {
      setPreviewTemplate(null);
      setTemplates(prev => [templateData, ...prev]);
      setSelectedTemplateId(templateData.id);
      
      setTicketModal({
        isOpen: true,
        title: "¡Plantilla Creada!",
        message: "La plantilla se ha guardado exitosamente.",
        ticketId: "Nueva Plantilla",
        customFields: [
          { label: "Nombre", value: templateData.title }
        ]
      });
      setActiveTab('templates');

      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
    } catch (err) {
      console.error("Error saving template", err);
    }
  };

  const getEmbedding = async (text, keyToUse) => {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${keyToUse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] }
        })
      });
      if (!res.ok) throw new Error(`Embedding API status: ${res.status}`);
      const data = await res.json();
      return data.embedding?.values || null;
    } catch (err) {
      console.error("Error fetching embedding:", err);
      return null;
    }
  };

  const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  const vectorizeAndFilterContext = async (textSource, keyToUse) => {
    if (textSource.length < 3000) {
      return textSource;
    }

    // Split text into chunks of approx 800 characters
    const chunks = [];
    const chunkSize = 800;
    let index = 0;
    while (index < textSource.length) {
      chunks.push(textSource.substring(index, index + chunkSize));
      index += chunkSize - 100; // overlap of 100 chars
    }

    setUploadStatusMsg("Vectorizando fragmentos del documento...");
    setUploadProgress(20);

    const query = "estructura de procesos, pasos, responsabilidades, plazos y métricas";
    const queryEmbedding = await getEmbedding(query, keyToUse);
    if (!queryEmbedding) return textSource;

    const chunkEmbeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      setUploadStatusMsg(`Vectorizando fragmento ${i + 1}/${chunks.length}...`);
      const emb = await getEmbedding(chunks[i], keyToUse);
      if (emb) {
        chunkEmbeddings.push({ text: chunks[i], embedding: emb });
      }
    }

    if (chunkEmbeddings.length === 0) return textSource;

    // Score chunks
    const scoredChunks = chunkEmbeddings.map(item => {
      return {
        text: item.text,
        score: cosineSimilarity(queryEmbedding, item.embedding)
      };
    });

    // Sort and take top 4 most relevant chunks
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 4).map(c => c.text);

    console.log("Vectorization completed. Selected chunks count:", topChunks.length);
    return topChunks.join("\n\n---\n\n");
  };

  const generateTemplate = async (textSource, titleSuggestion = "Nuevo Proceso", audioData = null) => {
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
          companionAvatar: <Bot size={24} />,
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
        setPreviewTemplate(newTemp);
        setIsUploading(false);
        setUploadStatusMsg("");
        setManualText('');
      }, 2000);
      return;
    }

    try {
      setUploadProgress(15);
      // Run client-side vectorization if text is large
      const processedText = await vectorizeAndFilterContext(textSource, apiKey);

      setUploadProgress(35);
      setUploadStatusMsg("Consultando a Gemini AI...");

      const prompt = `
        Analiza el siguiente texto de directrices de un proceso organizacional y crea una plantilla estructurada de pasos interactivos en formato JSON.
        
        Asegúrate de aplicar principios de "Diseño Emocional" (Emotional Design):
        1. Asigna un nombre encantador y avatar (emoji) a un "companion" (compañero/guía) del proceso.
        2. Escribe saludos y mensajes de motivación empáticos y profesionales.
        3. Identifica cuáles pasos son físicos/manuales (deben ser "manual" en el tipo) y cuáles requieren subir un documento o entregable (deben ser "digital").
        4. Define un relativeOffsetDays (entero, ej: 1 para primer día, 3 para tercer día) para cada paso, lo cual servirá para calcular plazos a partir de una fecha de inicio.
        
        REGLAS DE TONO Y ESTILO (CRÍTICO):
        - NO utilices adjetivos ni palabras exageradas o floridas como "blindada", "imparable", "impecable", "espectacular", "increíble", "maravilloso", "cálido", "bonito".
        - El tono debe ser altamente profesional, directo, analítico, sobrio, formal y sin adornos.
        - Actúa como un experto consultor corporativo en planteamiento, optimización y seguimiento de procesos.
        - Las frases de motivación deben ser profesionales y de aliento enfocado en el logro, la eficiencia y el control, no empalagosas ni excesivamente emocionales (evita exclamaciones infantiles).
        
        VALIDACIÓN DE CONTENIDO (CRÍTICO):
        - Si el texto de directrices NO describe un proceso organizacional real, contiene únicamente frases de prueba vacías (ej: "esto es una prueba", "hola", "ejemplo", "probando micrófono"), o carece por completo de pasos lógicos estructurables, NO inventes una plantilla de procesos ficticia.
        - En su lugar, debes responder ÚNICAMENTE con el siguiente objeto JSON de error (ningún otro campo en la respuesta):
          {
            "error": "El audio o texto ingresado no describe un proceso organizativo válido o contiene información insuficiente para estructurar una plantilla de pasos."
          }
        
        El resultado DEBE ser estrictamente un objeto JSON válido, sin ningún texto adicional, explicaciones ni formato HTML. Puedes usar bloques de código markdown si es necesario, pero asegúrate de que el JSON sea perfectamente analizable.
        
        Estructura esperada en caso de éxito:
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
        
        Texto de directrices (fragmentos vectorizados más relevantes):
        """
        ${processedText}
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
                },
                ...(audioData ? [audioData] : [])
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
      
      if (parsedTemplate.error) {
        setUploadStatusMsg("");
        setIsUploading(false);
        showAlert(parsedTemplate.error);
        return;
      }

      const tempId = "t_ai_" + Date.now();
      
      const finalTemplate = {
        ...parsedTemplate,
        id: tempId
      };

      setPreviewTemplate(finalTemplate);
      setIsUploading(false);
      setUploadStatusMsg("");
      setManualText('');
      
    } catch (error) {
      console.error(error);
      setUploadStatusMsg("Error al generar flujo con IA.");
      setTimeout(() => {
        setIsUploading(false);
        showAlert(`Hubo un problema al consultar a Gemini: ${error.message || error}\n\nPor favor, verifica que tu API Key sea correcta.`);
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
            showAlert("No se pudo extraer texto del archivo Word.");
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
            showAlert("No se pudo extraer texto del archivo PDF.");
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
      showAlert("Error al procesar el archivo.");
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
    if (!showAuthScreen) {
      return (
        <LandingPage 
          onLoginClick={() => { setAuthView('login'); setShowAuthScreen(true); }}
          onStartFree={(email) => { 
            setAuthForm({ ...authForm, email }); 
            setAuthView('register'); 
            setShowAuthScreen(true); 
          }}
        />
      );
    }

    let title = '';
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
          {title && <h2 className="auth-title">{title}</h2>}
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

          <div className="auth-switch" style={{ marginTop: '1rem' }}>
            <span onClick={() => { setShowAuthScreen(false); setAuthError(''); setAuthSuccessMsg(''); }}>
              ← Volver al inicio
            </span>
          </div>
        </div>
      </div>
    );
  }
  const floatingItems = [
    {
      id: 'instances',
      label: 'Ejecuciones',
      icon: <Play size={20} />,
      type: 'tab',
      onClick: () => setActiveTab('instances')
    },
    ...(user?.role !== 'guest' ? [
      {
        id: 'templates',
        label: 'Plantillas',
        icon: <FileText size={20} />,
        type: 'tab',
        onClick: () => setActiveTab('templates')
      },
      {
        id: 'team',
        label: 'Equipo',
        icon: <Users size={20} />,
        type: 'tab',
        onClick: () => setActiveTab('team')
      },
      {
        id: 'ecosystem',
        label: 'Ecosistema',
        icon: <LayoutGrid size={20} />,
        type: 'tab',
        onClick: () => setActiveTab('ecosystem')
      }
    ] : []),
    {
      id: 'settings',
      label: 'Ajustes',
      icon: <Smile size={20} />,
      type: 'tab',
      onClick: () => setActiveTab('settings')
    },
    {
      id: 'gemini',
      label: 'Gemini Key',
      icon: <Key size={20} className={apiKey ? 'text-primary' : ''} />,
      type: 'action',
      onClick: () => setShowKeyInput(!showKeyInput)
    },
    {
      id: 'logout',
      label: 'Salir',
      icon: <LogOut size={20} />,
      type: 'action',
      onClick: handleLogout
    }
  ];
  
  const getPreviewTitle = () => {
    if (!configuringRule) return '';
    const associatedTemplate = templates.find(t => t.id === configuringRule.templateId);
    const templateTitle = associatedTemplate ? associatedTemplate.title : 'Plantilla';
    return (configuringRule.titlePattern || '{template_title} - {task_name}')
      .replace(/{task_name}/g, 'Tarea de ClickUp (Ejemplo)')
      .replace(/{template_title}/g, templateTitle)
      .replace(/{list_name}/g, configuringRule.clickupListName || 'Lista ClickUp')
      .replace(/{task_id}/g, '#12345');
  };

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

      {/* Unified Header Navigation */}
      <header className="app-header-unified">
        <div className="nav-container-unified">
          {/* Logo Section */}
          <div className="logo-section" onClick={() => { setActiveTab('instances'); setOpenDropdown(null); }} style={{ cursor: 'pointer' }}>
            <img src="https://konsul.digital/images/Konsul%20logo%20general.png" alt="Kônsul Logo" className="logo-img" />
          </div>

          {/* Desktop Navigation Menu (Middle) */}
          <nav className="desktop-nav">
            {/* 1. Ejecuciones Dropdown */}
            <div className="nav-menu-item-unified" onMouseLeave={() => setOpenDropdown(null)}>
              <button 
                className={`nav-trigger-btn ${activeTab === 'instances' ? 'active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'procesos' ? null : 'procesos')}
                onMouseEnter={() => setOpenDropdown('procesos')}
              >
                <Play size={15} className="icon-blue" />
                <span>Ejecuciones</span>
                <ChevronDown size={12} className={`chevron-icon ${openDropdown === 'procesos' ? 'open' : ''}`} />
              </button>

              {openDropdown === 'procesos' && (
                <div className="nav-dropdown-content dropdown-large">
                  <div className="dropdown-grid-split">
                    <div className="grid-split-cards">
                      <div 
                        className="grid-card-nav"
                        onClick={() => { setActiveTab('instances'); setOpenDropdown(null); }}
                      >
                        <div className="card-nav-header">
                          <Play size={18} className="icon-blue" />
                          <h4>Mi Checklist Activo</h4>
                        </div>
                        <p>Monitorea y completa las tareas asignadas en ejecuciones en curso ({instances.length})</p>
                      </div>

                      <div 
                        className="grid-card-nav"
                        onClick={() => {
                          setLaunchInstanceName('');
                          setLaunchStartDate(new Date().toISOString().split('T')[0]);
                          setLaunchTemplateId(templates[0]?.id || '');
                          setLaunchModalStep(1);
                          setShowLaunchModal(true);
                          setOpenDropdown(null);
                        }}
                      >
                        <div className="card-nav-header">
                          <Zap size={18} className="icon-orange" />
                          <h4>Lanzar Nuevo Proceso</h4>
                        </div>
                        <p>Inicia de inmediato una ejecución en tiempo real de una plantilla operativa</p>
                      </div>
                    </div>

                    <div className="grid-split-small" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div 
                        className="nav-small-item-link"
                        onClick={() => {
                          setActiveTab('instances');
                          setOpenDropdown(null);
                          setTimeout(() => {
                            const el = document.getElementById('instances-logs-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                      >
                        <Bell size={16} />
                        <span>Historial de Alertas</span>
                      </div>
                      <div 
                        className="nav-small-item-link"
                        onClick={() => {
                          setActiveTab('clients');
                          setOpenDropdown(null);
                        }}
                      >
                        <Users size={16} />
                        <span>Clientes</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Plantillas Dropdown */}
            {user?.role !== 'guest' && (
              <div className="nav-menu-item-unified" onMouseLeave={() => setOpenDropdown(null)}>
                <button 
                  className={`nav-trigger-btn ${activeTab === 'templates' ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(openDropdown === 'plantillas' ? null : 'plantillas')}
                  onMouseEnter={() => setOpenDropdown('plantillas')}
                >
                  <FileText size={15} className="icon-orange" />
                  <span>Plantillas</span>
                  <ChevronDown size={12} className={`chevron-icon ${openDropdown === 'plantillas' ? 'open' : ''}`} />
                </button>

                {openDropdown === 'plantillas' && (
                  <div className="nav-dropdown-content dropdown-large">
                    <div className="dropdown-grid-split">
                      <div className="grid-split-cards">
                        <div 
                          className="grid-card-nav"
                          onClick={() => { setActiveTab('templates'); setOpenDropdown(null); }}
                        >
                          <div className="card-nav-header">
                            <FileText size={18} className="icon-orange" />
                            <h4>Catálogo de Plantillas</h4>
                          </div>
                          <p>Administra, edita pasos o elimina plantillas de la organización ({templates.length})</p>
                        </div>

                        <div 
                          className="grid-card-nav"
                          onClick={() => {
                            setActiveTab('templates');
                            setOpenDropdown(null);
                            setTimeout(() => {
                              const el = document.getElementById('main-uploader');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                        >
                          <div className="card-nav-header">
                            <Sparkles size={18} className="icon-blue" />
                            <h4>Generar con Gemini IA</h4>
                          </div>
                          <p>Sube archivos (.pdf, .docx, .txt) y deja que Gemini estructure tu plantilla</p>
                        </div>
                      </div>

                      <div className="grid-split-small">
                        <div 
                          className="nav-small-item-link"
                          onClick={() => {
                            setActiveTab('templates');
                            setOpenDropdown(null);
                            setTimeout(() => {
                              const el = document.getElementsByTagName('textarea')[0];
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth' });
                                el.focus();
                              }
                            }, 150);
                          }}
                        >
                          <Code size={16} />
                          <span>Generador Manual</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Equipo Dropdown */}
            {user?.role !== 'guest' && (
              <div className="nav-menu-item-unified" onMouseLeave={() => setOpenDropdown(null)}>
                <button 
                  className={`nav-trigger-btn ${activeTab === 'team' ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(openDropdown === 'equipo' ? null : 'equipo')}
                  onMouseEnter={() => setOpenDropdown('equipo')}
                >
                  <Users size={15} className="icon-green" />
                  <span>Equipo</span>
                  <ChevronDown size={12} className={`chevron-icon ${openDropdown === 'equipo' ? 'open' : ''}`} />
                </button>

                {openDropdown === 'equipo' && (
                  <div className="nav-dropdown-content dropdown-large">
                    <div className="dropdown-grid-split">
                      <div className="grid-split-cards">
                        <div 
                          className="grid-card-nav"
                          onClick={() => { setActiveTab('team'); setOpenDropdown(null); }}
                        >
                          <div className="card-nav-header">
                            <Users size={18} className="icon-green" />
                            <h4>Directorio de Personal</h4>
                          </div>
                          <p>Consulta datos de agentes, invitados y jefes directos ({teamMembers.length})</p>
                        </div>

                        <div 
                          className="grid-card-nav"
                          onClick={() => {
                            setActiveTab('templates');
                            setOpenDropdown(null);
                            if (templates.length > 0) {
                              setSelectedTemplateId(templates[0].id);
                              setDetailModalTab('team');
                            }
                          }}
                        >
                          <div className="card-nav-header">
                            <Share2 size={18} className="icon-blue" />
                            <h4>Asignación Matricial</h4>
                          </div>
                          <p>Define con un panel Sí/No qué pasos de procesos opera cada miembro</p>
                        </div>
                      </div>

                      <div className="grid-split-small">
                        <div 
                          className="nav-small-item-link"
                          onClick={() => {
                            setActiveTab('team');
                            setOpenDropdown(null);
                            setEditingMember(null);
                            setMemberFormData({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '', systemRole: '' });
                            setMemberModalStep(1);
                            setShowMemberModal(true);
                          }}
                        >
                          <Users size={16} />
                          <span>Agregar Personal</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {user?.role !== 'guest' && (
              <div className="nav-menu-item-unified">
                <button 
                  className={`nav-trigger-btn ${activeTab === 'ecosystem' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('ecosystem'); setOpenDropdown(null); }}
                >
                  <LayoutGrid size={15} className="icon-blue" />
                  <span>Ecosistema</span>
                </button>
              </div>
            )}
          </nav>

          {/* Right Header Status / Account Dropdown */}
          <div className="header-badge-section">
            <div className="desktop-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Notifications user={user} apiUrl="/api" onNavigate={(n) => { const instId = n.instance_id || n.instanceId; if (instId) setSelectedInstanceId(instId); }} onCompleteStep={handleStepComplete} addToast={addToast} />
              <div className="nav-menu-item-unified" onMouseLeave={() => setOpenDropdown(null)}>
                <button 
                  className={`nav-trigger-btn ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(openDropdown === 'cuenta' ? null : 'cuenta')}
                  onMouseEnter={() => setOpenDropdown('cuenta')}
                >
                  <div className="user-avatar-small">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US'}
                  </div>
                  <span>Mi Cuenta</span>
                  <ChevronDown size={14} className={`chevron-icon ${openDropdown === 'cuenta' ? 'open' : ''}`} />
                </button>

                {openDropdown === 'cuenta' && (
                  <div className="nav-dropdown-content dropdown-large dropdown-right-align">
                    <div className="dropdown-grid-split">
                      <div className="grid-split-cards">
                        <div 
                          className="grid-card-nav"
                          onClick={() => { 
                            setActiveTab('settings'); 
                            setOpenDropdown(null);
                            setTimeout(() => {
                              const el = document.getElementById('profile-form-section');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                        >
                          <div className="card-nav-header">
                            <Smile size={18} className="icon-green" />
                            <h4>Editar Perfil</h4>
                          </div>
                          <p>Modifica tu contraseña, emoji avatar y acompañante de inteligencia</p>
                        </div>

                        {user?.role !== 'guest' && (
                          <div 
                            className={`grid-card-nav ${apiKey ? 'configured' : ''}`}
                            onClick={() => {
                              setShowKeyInput(!showKeyInput);
                              setOpenDropdown(null);
                            }}
                          >
                            <div className="card-nav-header">
                              <Key size={18} className="icon-orange" />
                              <h4>Gemini API Key</h4>
                            </div>
                            <p>{apiKey ? 'Clave IA configurada localmente' : 'Carga tu clave para habilitar Gemini IA'}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid-split-small">
                        {user?.role === 'admin' && (
                          <div 
                            className="nav-small-item-link"
                            onClick={() => { 
                              setActiveTab('settings'); 
                              setOpenDropdown(null);
                              setTimeout(() => {
                                const el = document.getElementById('company-form-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                              }, 100);
                            }}
                          >
                            <Sparkles size={16} />
                            <span>Empresa</span>
                          </div>
                        )}

                        <div 
                          className="nav-small-item-link logout" 
                          onClick={() => { handleLogout(); setOpenDropdown(null); }}
                          style={{ marginTop: '0.5rem', color: '#ef4444' }}
                        >
                          <LogOut size={16} />
                          <span>Cerrar Sesión</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Floating Nav Bar */}
      <div className="mobile-floating-nav">
        <div className="floating-nav-container">
          {floatingItems.map((item, index) => {
            const isActive = item.type === 'tab' ? activeTab === item.id : false;
            return (
              <button
                key={index}
                onClick={item.onClick}
                className={`floating-nav-btn ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <div className="floating-nav-icon">{item.icon}</div>
                <span className="floating-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

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
                ? `¡Increíble logro! Hemos terminado todo el flujo de "${activeInstance.instanceName}". ¡Estoy sumamente orgulloso/a de tu dedicación!`
                : `¡Hola! Estamos en marcha con "${activeInstance.instanceName}". ¡Confío plenamente en ti!`
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
            <div style={{ width: '100%' }}>
              {/* Focus vs Bird's Eye View Mode Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)', margin: 0 }}>Ejecuciones Activas</h2>
                  <div style={{ display: 'inline-flex', background: '#f5f3f0', borderRadius: '20px', padding: '3px', marginLeft: '12px' }}>
                    <button
                      onClick={() => setDashboardViewMode('focus')}
                      style={{ border: 'none', background: dashboardViewMode === 'focus' ? 'white' : 'transparent', color: dashboardViewMode === 'focus' ? 'var(--color-primary-hover)' : 'var(--text-muted)', padding: '6px 12px', borderRadius: '18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: dashboardViewMode === 'focus' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}
                    >
                      Enfoque 🔍
                    </button>
                    <button
                      onClick={() => setDashboardViewMode('birds-eye')}
                      style={{ border: 'none', background: dashboardViewMode === 'birds-eye' ? 'white' : 'transparent', color: dashboardViewMode === 'birds-eye' ? 'var(--color-primary-hover)' : 'var(--text-muted)', padding: '6px 12px', borderRadius: '18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: dashboardViewMode === 'birds-eye' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}
                    >
                      Vista de Pájaro 🦅
                    </button>
                  </div>
                </div>

                {user?.role !== 'guest' && (
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
                    <Rocket size={18} style={{marginRight:'4px'}} /> Nueva Ejecución
                  </button>
                )}
              </div>

              {/* Mi Momento Card */}
              {(() => {
                const myMember = teamMembers.find(m => m.email?.toLowerCase() === user?.email?.toLowerCase());
                const myMomentSteps = [];
                if (myMember) {
                  instances.forEach(inst => {
                    const nextStepIdx = inst.steps.findIndex(s => !s.isCompleted);
                    if (nextStepIdx !== -1) {
                      const activeStep = inst.steps[nextStepIdx];
                      const isAssigned = Array.isArray(activeStep.assignedTo)
                        ? activeStep.assignedTo.map(String).includes(String(myMember.id))
                        : String(activeStep.assignedTo) === String(myMember.id);
                      if (isAssigned) {
                        myMomentSteps.push({
                          instance: inst,
                          step: activeStep,
                          index: nextStepIdx
                        });
                      }
                    }
                  });
                }

                if (dashboardViewMode === 'focus' && myMomentSteps.length > 0) {
                  return (
                    <div className="my-moment-container" style={{ background: 'linear-gradient(135deg, #fdfbf7 0%, #FAF8F5 100%)', border: '1px solid #ebd8c0', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🎯</span>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#664d2d' }}>Mi Momento (Tus Pendientes de Hoy)</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {myMomentSteps.map(item => (
                          <div key={item.step.id} onClick={() => setSelectedInstanceId(item.instance.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: '1px solid #ebd8c0', borderRadius: '12px', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} className="hover-lift-subtle">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-hover)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {item.instance.instanceName}
                              </span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                {item.step.title}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {item.step.description}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                              <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                                Vence: {new Date(item.step.dueDate).toLocaleDateString()}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#b58b53', fontWeight: 600 }}>
                                Toca tu turno ➡️
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {selectedClientFilter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(var(--color-primary-rgb), 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-primary-hover)', fontWeight: 'bold' }}>
                    Filtrando por cliente: {clients.find(c => c.id === selectedClientFilter)?.name}
                  </span>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => setSelectedClientFilter(null)}
                  >
                    Quitar filtro
                  </button>
                </div>
              )}

              {(() => {
                const myMember = teamMembers.find(m => m.email?.toLowerCase() === user?.email?.toLowerCase());
                const filteredInstances = instances.filter(inst => {
                  if (selectedClientFilter && getClientForInstance(inst, clients) !== selectedClientFilter) return false;
                  if (dashboardViewMode === 'birds-eye') return true;
                  if (!myMember) return false;
                  return inst.steps.some(s => Array.isArray(s.assignedTo) ? s.assignedTo.map(String).includes(String(myMember.id)) : String(s.assignedTo) === String(myMember.id));
                });

                if (filteredInstances.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-primary)' }}><Rocket size={64} /></div>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>No hay ejecuciones activas</h3>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Selecciona una plantilla e iníciala para comenzar a seguir un proceso en tiempo real.</p>
                      {user?.role !== 'guest' && (
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
                          <Rocket size={18} style={{marginRight:'4px'}} /> Iniciar Primera Ejecución
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="process-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {filteredInstances.map(inst => {
                      const total = inst.steps.length;
                      const completed = inst.steps.filter(s => s.isCompleted).length;
                      const percentage = Math.round((completed / total) * 100) || 0;
                      const isOverdue = checkOverdueSteps(inst);

                      return (
                        <div 
                          key={inst.id}
                          className={`process-card ${inst.id === selectedInstanceId ? 'active' : ''}`}
                          onClick={() => setSelectedInstanceId(inst.id)}
                          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer' }}
                        >
                          <div className="process-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <h4 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>{inst.instanceName}</h4>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inst.category}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Plantilla: {inst.title}</span>
                            </div>
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
                          
                          {/* Start and End Dates */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>Inicio: {inst.steps[0]?.dueDate ? new Date(inst.steps[0].dueDate).toLocaleDateString() : 'N/A'}</span>
                            <span>Fin: {inst.steps[inst.steps.length - 1]?.dueDate ? new Date(inst.steps[inst.steps.length - 1].dueDate).toLocaleDateString() : 'N/A'}</span>
                          </div>

                          <div className="process-meta" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Involved team members initials */}
                            <div style={{ display: 'flex', marginLeft: 'auto' }}>
                              {(() => {
                                const allAssignees = (inst.steps || [])
                                  .filter(Boolean)
                                  .filter(s => s.assignedTo)
                                  .flatMap(s => Array.isArray(s.assignedTo) ? s.assignedTo : [s.assignedTo])
                                  .map(String);
                                const uniqueAssignees = Array.from(new Set(allAssignees));
                                return (
                                  <>
                                    {uniqueAssignees.slice(0, 3).map((assigneeId, i) => {
                                      const member = teamMembers.find(m => String(m.id) === String(assigneeId));
                                      if (!member) return null;
                                      const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                      return (
                                        <div key={assigneeId} title={member.name} style={{
                                          width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold',
                                          border: '2px solid white', marginLeft: i > 0 ? '-8px' : '0', zIndex: 10 - i
                                        }}>
                                          {initials}
                                        </div>
                                      );
                                    })}
                                    {uniqueAssignees.length > 3 && (
                                      <div style={{
                                        width: '24px', height: '24px', borderRadius: '50%', background: '#e0e0e0', color: 'var(--text-main)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold',
                                        border: '2px solid white', marginLeft: '-8px', zIndex: 0
                                      }}>
                                        +{uniqueAssignees.length - 3}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            <span className="badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                              {inst.category}
                            </span>
                            {isOverdue && (
                              <span className="overdue-badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={12} /> Demorado
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
                );
              })()}
            </div>
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
                      onClick={() => {
                        setSelectedTemplateId(temp.id);
                        setDetailModalTab('steps');
                      }}
                    >
                      <div className="template-card-body" style={{ paddingTop: '2rem' }}>
                        <div className="template-card-meta">
                          <div className="template-card-meta-left">
                            <span>⏱️ {temp.durationDays} {temp.durationDays === 1 ? 'día' : 'días'}</span>
                            <span>•</span>
                            <span className="status-dot" style={{ backgroundColor: temp.status === 'approved' ? '#4caf50' : temp.status === 'rejected' ? '#f44336' : '#ff9800' }}></span>
                            <span>{temp.status === 'approved' ? 'Activo' : temp.status === 'rejected' ? 'Rechazado' : 'Pendiente'}</span>
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
                          <span className="template-card-badge"><Bot size={14} style={{marginRight:'4px', display:'inline-block'}}/> {temp.companionName || 'Guía'}</span>
                        </div>
                        
                        <hr className="template-card-divider" />
                        
                        <div className="template-card-footer" style={{ marginTop: 'auto' }}>
                          <div className="avatar-group" style={{ display: 'flex', gap: '4px' }}>
                            {(() => {
                              // Get unique members involved in this template
                              const allAssignees = (temp.steps || [])
                                .filter(Boolean)
                                .filter(s => s.assignedTo)
                                .flatMap(s => Array.isArray(s.assignedTo) ? s.assignedTo : [s.assignedTo])
                                .map(String);
                              const assignedIds = new Set(allAssignees);
                              const uniqueMembers = teamMembers.filter(m => assignedIds.has(String(m.id)));
                              return (
                                <>
                                  {uniqueMembers.slice(0, 4).map(member => (
                                    <div 
                                      key={member.id} 
                                      title={`${member.name} (${member.role})`}
                                      style={{ 
                                        width: '28px', 
                                        height: '28px', 
                                        borderRadius: '50%', 
                                        backgroundColor: 'var(--color-primary)', 
                                        color: 'white', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        fontWeight: 'bold', 
                                        fontSize: '0.75rem',
                                        border: '2px solid white'
                                      }}
                                    >
                                      {member.name ? member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                                    </div>
                                  ))}
                                  {uniqueMembers.length === 0 && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin asignar</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div className="action-circles" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {user?.role === 'admin' && temp.status === 'pending_approval' && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  title="Aprobar Plantilla"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleUpdateTemplateStatus(temp.id, 'approved'); 
                                  }}
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'rgba(76,175,80,0.1)', color: '#2e7d32', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  Aprobar
                                </button>
                                <button
                                  title="Rechazar Plantilla"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleUpdateTemplateStatus(temp.id, 'rejected'); 
                                  }}
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'rgba(244,67,54,0.1)', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  Rechazar
                                </button>
                              </div>
                            )}
                            {(!temp.status || temp.status === 'approved') && (
                              <button 
                                className="circle-btn blue" 
                                title="Iniciar Ejecución" 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedTemplateId(temp.id); 
                                  setLaunchTemplateId(temp.id);
                                  setLaunchModalStep(1);
                                  setShowLaunchModal(true); 
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: 'rgba(39,190,167,0.1)', color: 'var(--color-primary)' }}
                              >
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span>
                              </button>
                            )}
                            <button 
                              className="circle-btn red" 
                              title="Eliminar Plantilla" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleDeleteTemplate(temp.id); 
                              }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: 'rgba(211,47,47,0.1)', color: '#d32f2f' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Template details Modal Popup */}
              <TemplateDetailsModal
                isOpen={!!(selectedTemplateId && activeTemplate)}
                onClose={() => setSelectedTemplateId("")}
                activeTemplate={activeTemplate}
                onLaunch={() => setShowLaunchModal(true)}
                onDelete={handleDeleteTemplate}
                saveTemplate={saveTemplate}
                teamMembers={teamMembers}
                detailModalTab={detailModalTab}
                setDetailModalTab={setDetailModalTab}
                draftAssignment={draftAssignment}
                setDraftAssignment={setDraftAssignment}
                editingStepIndex={editingStepIndex}
                setEditingStepIndex={setEditingStepIndex}
                editingStepData={editingStepData}
                setEditingStepData={setEditingStepData}
                handleUpdateStep={handleUpdateStep}
                handleDeleteStep={handleDeleteStep}
                handleAddStep={handleAddStep}
                expandedTemplateMembers={expandedTemplateMembers}
                setExpandedTemplateMembers={setExpandedTemplateMembers}
                setTicketModal={setTicketModal}
              />
            </div>
          
          ) : activeTab === 'clients' ? (
            <div>
              <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)', margin: 0 }}>
                  Clientes
                </h2>
              </div>
              {clients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <Users size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
                  <h3>No hay clientes registrados</h3>
                  <p>Inicia una ejecución y registra tu primer cliente para verlo aquí.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem', marginTop: '1.5rem' }}>
                  {clients.map((c, idx) => {
                    const client = getClientDisplay(c, idx);
                    const clientInstances = instances.filter(inst => getClientForInstance(inst, clients) === client.id);
                    const active = clientInstances.filter(inst => !inst.steps.every(s => s.isCompleted)).length;
                    const completed = clientInstances.filter(inst => inst.steps.every(s => s.isCompleted)).length;
                    const statsText = `${active} Activas • ${completed} Completadas`;

                    return (
                      <div key={client.id} style={{ height: '360px' }}>
                        <DestinationCard
                          imageUrl={client.imageUrl}
                          location={client.name}
                          flag={client.flag}
                          stats={statsText}
                          themeColor={client.themeColor}
                          onClick={() => {
                            setSelectedClientFilter(client.id);
                            setActiveTab('instances');
                          }}
                        />
                      </div>
                    );
                  })}
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
                  modifiedTemplateIds = new Set();
                  setEditingMember(null);
                  setMemberFormData({ name: '', role: '', email: '', assignedProcesses: [], department: '', managerId: '', systemRole: '' });
                  setMemberModalStep(1);
                  setShowMemberModal(true);
                }}>
                  <Plus size={18} style={{marginRight:'4px', display:'inline-block'}}/> Agregar Personal
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
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0 }}>
                            {member.name ? member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{member.name}</h4>
                            <span className="badge" style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', marginTop: '2px', display: 'inline-block' }}>
                              {member.role}
                            </span>
                            {member.status === 'pending' && (
                              <span className="badge warning" style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', marginTop: '2px', marginLeft: '6px', display: 'inline-block', backgroundColor: '#fff3cd', color: '#856404' }}>
                                Pendiente
                              </span>
                            )}
                            {member.status === 'active' && (
                              <span className="badge success" style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', marginTop: '2px', marginLeft: '6px', display: 'inline-block' }}>
                                Activo
                              </span>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          <Mail size={16} style={{marginRight:'4px', display:'inline-block'}}/> {member.email}
                        </p>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          <Building size={16} style={{marginRight:'4px', display:'inline-block'}}/> <strong>Área:</strong> {member.department || 'Sin especificar'}
                        </div>
                        {member.managerId && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            <User size={16} style={{marginRight:'4px', display:'inline-block'}}/> <strong>Jefe Directo:</strong> {(() => {
                              const mgr = teamMembers.find(m => m.id === member.managerId);
                              if (mgr) return mgr.name;
                              const orgAdmin = orgUsers.find(u => u.id === member.managerId || `admin_${u.id}` === member.managerId || `u_${u.id}` === member.managerId || String(u.id) === String(member.managerId));
                              return orgAdmin ? `${orgAdmin.name} (Admin)` : 'N/A';
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
                      {!member.isSystem && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid #f5f3f0', paddingTop: '0.75rem' }}>
                          {member.status === 'pending' && (
                            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', marginRight: 'auto', backgroundColor: '#e2e8f0', color: '#475569' }} onClick={() => handleResendInvite(member.id)}>
                              Reenviar Invitación
                            </button>
                          )}
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                            modifiedTemplateIds = new Set();
                            setEditingMember(member);
                            const sysUser = orgUsers.find(u => u.email?.toLowerCase() === member.email?.toLowerCase());
                            setMemberFormData({ name: member.name, role: member.role, email: member.email, assignedProcesses: member.assignedProcesses || [], department: member.department || '', managerId: member.managerId || '', systemRole: sysUser ? sysUser.role : '' });
                            setMemberModalStep(1);
                            setShowEditProfileModal(true);
                          }}>
                            Editar
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', color: '#d32f2f' }} onClick={() => handleDeleteMember(member.id)}>
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'ecosystem' ? (
            <div>
              <div className="section-title">
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)', margin: 0 }}>
                  Ecosistema de Aplicaciones
                </h2>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                Conecta tu agente con las herramientas que ya utilizas
              </p>

              {/* Capsule Subtabs */}
              <div style={{
                background: 'white',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '30px',
                padding: '0.5rem',
                display: 'inline-flex',
                gap: '8px',
                marginBottom: '2rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <button
                  onClick={() => setEcosystemSubTab('oficiales')}
                  style={{
                    border: 'none',
                    background: ecosystemSubTab === 'oficiales' ? 'rgba(39, 190, 167, 0.1)' : 'transparent',
                    color: ecosystemSubTab === 'oficiales' ? 'var(--color-primary)' : 'var(--text-muted)',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <LayoutGrid size={16} /> Oficiales
                </button>
                <button
                  onClick={() => setEcosystemSubTab('ondemand')}
                  style={{
                    border: 'none',
                    background: ecosystemSubTab === 'ondemand' ? 'rgba(39, 190, 167, 0.1)' : 'transparent',
                    color: ecosystemSubTab === 'ondemand' ? 'var(--color-primary)' : 'var(--text-muted)',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Sparkles size={16} /> On Demand
                </button>
              </div>

              {ecosystemSubTab === 'oficiales' ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1.5rem'
                }}>
                  {/* ClickUp Integration Card */}
                  <div style={{
                    background: 'white',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '24px',
                    padding: '2rem',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '260px',
                    position: 'relative'
                  }}>
                    <div>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7b68ee, #6050dc)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        marginBottom: '1.25rem'
                      }}>
                        CU
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>ClickUp</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                        Conecta tus listas de ClickUp para automatizar la creación y el inicio de procesos y tareas operativas.
                      </p>
                      {clickupToken && (
                        <span className="badge success" style={{ position: 'absolute', top: '2rem', right: '2rem' }}>
                          Conectado
                        </span>
                      )}
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowClickupModal(true)}
                      style={{
                        width: '100%',
                        borderRadius: '30px',
                        padding: '0.65rem',
                        marginTop: '1.5rem',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {clickupToken ? 'CONFIGURAR' : 'ACTIVAR'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'white',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '24px',
                  padding: '3rem',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <Sparkles size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }} />
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Integraciones On Demand</h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    ¿Necesitas conectar una herramienta específica a Kônsul? Desarrollamos integraciones a la medida de los flujos y procesos de tu negocio.
                  </p>
                  <button
                    onClick={() => setShowOnDemandModal(true)}
                    className="btn btn-primary"
                    style={{
                      borderRadius: '30px',
                      padding: '0.65rem 2rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Solicitar Integración
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Settings Tab View (activeTab === 'settings') */
            <div>
              <div className="section-title">
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-main)', margin: 0 }}>
                  <Settings size={20} style={{marginRight:'4px', display:'inline-block'}}/> Configuración del Sistema
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
                <div id="profile-form-section" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
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
                    {user?.role === 'admin' && (
                      <>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Nombre del Acompañante/Guía por Defecto</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Ej. Kônsul Bot" 
                            value={profileFormData.companionName} 
                            onChange={(e) => setProfileFormData({ ...profileFormData, companionName: e.target.value })} 
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Emoji del Acompañante/Guía (Avatar)</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Ej. Avatar URL" 
                            value={profileFormData.companionAvatar} 
                            onChange={(e) => setProfileFormData({ ...profileFormData, companionAvatar: e.target.value })} 
                          />
                        </div>
                      </>
                    )}
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                      Actualizar Perfil
                    </button>
                  </form>
                </div>

                {/* Form: Email Settings (SMTP & IMAP/POP) */}
                <div id="email-settings-form-section" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Conexión de Correo</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Conecta tus credenciales (IMAP/POP y SMTP) para enviar correos desde las ejecuciones.</p>
                  
                  <form onSubmit={handleSaveEmailSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-primary)', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>Envío (SMTP)</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div className="form-group" style={{ flex: 2 }}>
                        <label style={{ fontWeight: 600, fontSize: '0.75rem' }}>Host SMTP</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="smtp.gmail.com"
                          value={smtpSettings.smtpHost} 
                          onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpHost: e.target.value })} 
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ fontWeight: 600, fontSize: '0.75rem' }}>Puerto SMTP</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="465"
                          value={smtpSettings.smtpPort} 
                          onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpPort: e.target.value })} 
                          required 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ fontWeight: 600, fontSize: '0.75rem' }}>Usuario SMTP</label>
                        <input 
                          type="email" 
                          className="form-input" 
                          placeholder="usuario@correo.com"
                          value={smtpSettings.smtpUser} 
                          onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpUser: e.target.value })} 
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ fontWeight: 600, fontSize: '0.75rem' }}>Contraseña SMTP</label>
                        <input 
                          type="password" 
                          className="form-input" 
                          placeholder="••••••••"
                          value={smtpSettings.smtpPass} 
                          onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpPass: e.target.value })} 
                          required 
                        />
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-primary)', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px', marginTop: '0.5rem' }}>Recepción (IMAP/POP)</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div className="form-group" style={{ flex: 2 }}>
                        <label style={{ fontWeight: 600, fontSize: '0.75rem' }}>Host IMAP/POP</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="imap.gmail.com"
                          value={imapSettings.imapHost} 
                          onChange={(e) => setImapSettings({ ...imapSettings, imapHost: e.target.value })} 
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ fontWeight: 600, fontSize: '0.75rem' }}>Puerto</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="993"
                          value={imapSettings.imapPort} 
                          onChange={(e) => setImapSettings({ ...imapSettings, imapPort: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                      <input 
                        type="checkbox"
                        id="imapSecure"
                        checked={imapSettings.imapSecure}
                        onChange={(e) => setImapSettings({ ...imapSettings, imapSecure: e.target.checked })}
                      />
                      <label htmlFor="imapSecure" style={{ fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>Conexión Segura (SSL/TLS)</label>
                    </div>

                    {emailTestStatus && (
                      <div style={{ 
                        backgroundColor: emailTestStatus.loading ? '#e0f2f1' : emailTestStatus.success ? '#e8f5e9' : '#ffebee',
                        color: emailTestStatus.loading ? '#00695c' : emailTestStatus.success ? '#2e7d32' : '#c62828',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        marginTop: '0.25rem'
                      }}>
                        {emailTestStatus.loading ? 'Probando conexiones...' : emailTestStatus.message}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={handleTestEmailConnection}
                        style={{ flex: 1 }}
                      >
                        Probar Conexión
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ flex: 1 }}
                      >
                        Guardar Correo
                      </button>
                    </div>
                  </form>
                </div>

                {/* Form 2: Organization Name */}
                {user?.role === 'admin' && (
                  <div id="company-form-section" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
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
                )}

              </div>


              {/* User management list */}
              {user?.role === 'admin' && (
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
                      <Plus size={18} style={{marginRight:'4px', display:'inline-block'}}/> Invitar / Registrar Usuario
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
                              {u.id === user?.id ? (
                                <span 
                                  className={`badge ${u.role === 'admin' ? 'primary' : u.role === 'gerente' ? 'warning' : u.role === 'agent' ? 'info' : 'success'}`} 
                                  style={{ textTransform: 'capitalize', fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                                >
                                  {u.role === 'admin' ? 'Administrador' : u.role === 'gerente' ? 'Gerente' : u.role === 'agent' ? 'Agente' : 'Invitado'}
                                </span>
                              ) : (
                                <select
                                  value={u.role}
                                  onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                  style={{
                                    fontSize: '0.8rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    outline: 'none'
                                  }}
                                >
                                  <option value="admin">Administrador</option>
                                  <option value="gerente">Gerente</option>
                                  <option value="agent">Agente</option>
                                  <option value="guest">Invitado</option>
                                </select>
                              )}
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
                      <span style={{ color: '#d32f2f', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={14} /> Límite de invitados alcanzado</span>
                    )}
                  </div>
                </div>
              )}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`} 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={(isUploading && !isRecording) || !apiKey}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '1rem', position: 'relative' }}
                >
                  {isRecording && <span className="recording-pulse" style={{ position: 'absolute', right: '15px', width: '10px', height: '10px', background: 'white', borderRadius: '50%', animation: 'pulse 1s infinite' }} />}
                  <Mic size={18} />
                  {isRecording ? "Detener Grabación" : "Dictar por Audio"}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setIsWizardOpen(true)}
                  disabled={isUploading || !apiKey}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '1rem' }}
                >
                  <Sparkles size={18} /> Asistente Paso a Paso
                </button>
              </div>
            </div>

            {/* List based on active tab */}
            <div className="card-section">
              {activeTab === 'instances' ? (
                <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #FAF8F5 100%)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(181, 139, 83, 0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px dashed rgba(181, 139, 83, 0.15)' }}>
                    <div style={{ background: '#FFF7ED', color: 'var(--color-primary)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={16} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)' }}>
                      Asistente de Procesos
                    </h3>
                  </div>
                  
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                      ¿Tienes dudas sobre cómo ejecutar un paso o las pautas de un flujo? Selecciona el proceso para iniciar tu guía interactiva:
                    </p>
                    <select
                      value={chatTemplateId}
                      onChange={(e) => {
                        const selected = e.target.value;
                        setChatTemplateId(selected);
                        const temp = templates.find(t => t.id === selected);
                        if (temp) {
                          setChatMessages([
                            { sender: 'ai', text: `¡Hola! Soy tu asistente de Kônsul para **"${temp.title}"**. Puedes consultarme dudas como:\n- ¿Qué se hace en el paso 2?\n- ¿Cómo resolver el entregable?\n- ¿Cuál es el propósito general del flujo?` }
                          ]);
                        } else {
                          setChatMessages([]);
                        }
                      }}
                      style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #ebd8c0', fontSize: '0.85rem', outline: 'none', background: 'white', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '0.75rem' }}
                    >
                      <option value="">-- Seleccionar Proceso --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>

                    <button 
                      onClick={() => {
                        if (!chatTemplateId) {
                          alert("Por favor, selecciona un proceso primero.");
                          return;
                        }
                        setIsChatModalOpen(true);
                      }}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                    >
                      <MessageSquare size={16} /> Iniciar Consulta
                    </button>
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



          </div>
        )}

      </div>

      <ActiveExecutionModal
        isOpen={!!(selectedInstanceId && activeInstance)}
        onClose={() => setSelectedInstanceId(null)}
        activeInstance={activeInstance}
        teamMembers={teamMembers}
        checkOverdueSteps={checkOverdueSteps}
        handleStepComplete={handleStepComplete}
        handleAssignStepMember={handleAssignStepMember}
        handleUpdateStepComments={handleUpdateStepComments}
        currentUser={user}
        fileStore={fileStore}
        setFileStore={setFileStore}
        addToast={addToast}
      />


      {/* Start Execution Modal */}
      {showLaunchModal && (
        <LaunchExecutionModal
          templates={templates}
          teamMembers={teamMembers}
          clients={clients}
          initialTemplateId={activeTemplate?.id || launchTemplateId}
          onSchedule={(data) => {
            handleLaunchInstance(data);
            setShowLaunchModal(false);
          }}
          onCancel={() => { setShowLaunchModal(false); setLaunchModalStep(1); }}
        />
      )}

      {/* Chat Guia de Procesos Modal */}
      {isChatModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(23, 20, 18, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }} onClick={() => setIsChatModalOpen(false)}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #FAF8F5 100%)',
            borderRadius: '16px',
            width: '600px',
            maxHeight: '90vh',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: '1px solid rgba(181, 139, 83, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px dashed rgba(181, 139, 83, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#FFF7ED', color: 'var(--color-primary)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)' }}>
                    Asistente de Consulta
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-primary-hover)', fontWeight: 600 }}>
                    📖 Proceso: {templates.find(t => t.id === chatTemplateId)?.title}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Thread */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              height: '350px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(255, 255, 255, 0.4)'
            }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{
                  padding: '10px 14px',
                  borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  fontSize: '0.85rem',
                  maxWidth: '80%',
                  lineHeight: 1.5,
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)' : 'white',
                  color: msg.sender === 'user' ? 'white' : 'var(--text-main)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                  border: msg.sender === 'user' ? 'none' : '1px solid rgba(181,139,83,0.1)',
                  whiteSpace: 'pre-wrap',
                  textAlign: 'left'
                }}>
                  {msg.text}
                </div>
              ))}
              {isChatLoading && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '16px 16px 16px 2px', background: 'white', border: '1px solid rgba(181,139,83,0.1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="dot" style={{ width: '5px', height: '5px', background: 'var(--color-primary)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                  <span className="dot" style={{ width: '5px', height: '5px', background: 'var(--color-primary)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite 0.2s' }} />
                  <span className="dot" style={{ width: '5px', height: '5px', background: 'var(--color-primary)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite 0.4s' }} />
                </div>
              )}
            </div>

            {/* Footer Form */}
            <form onSubmit={handleSendChatMessage} style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px dashed rgba(181, 139, 83, 0.15)',
              display: 'flex',
              gap: '8px'
            }}>
              <input
                type="text"
                placeholder="Pregúntale a la IA sobre cómo completar un paso o pautas del proceso..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={isChatLoading || !apiKey}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #ebd8c0',
                  outline: 'none',
                  background: 'white',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                }}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isChatLoading || !apiKey}
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.85rem', borderRadius: '8px', fontWeight: 600 }}
              >
                Enviar
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Complete Celebration Modal */}
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-modal">
            <div className="celebration-emoji" style={{ display: "flex", justifyContent: "center", gap: "1rem", color: "var(--color-primary)" }}><PartyPopper size={64}/><Sparkles size={64}/><Trophy size={64}/></div>
            <h2>¡Súper Hazaña Lograda!</h2>
            <p>{celebrationMsg}</p>
            <button className="celebration-btn" onClick={() => setShowCelebration(false)}>
              ¡Continuar con Alegría!
            </button>
          </div>
        </div>
      )}

      {/* Team Member Add/Edit Modal */}
      
      {/* Edit Profile Modal */}
      <Dialog open={showEditProfileModal} onOpenChange={(open) => {
        if (!open) {
          setShowEditProfileModal(false);
          setEditingMember(null);
        }
      }}>
        <DialogContent style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: 0, width: '100%', maxWidth: '32rem', maxHeight: '90vh' }}>
          <DialogHeader style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          
          <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Nombre Completo</label>
                  <input
                    className="form-input"
                    placeholder="Ej. Ana Pérez"
                    value={memberFormData.name}
                    onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Puesto / Rol</label>
                    <input
                      className="form-input"
                      placeholder="Ej. Líder de Compras"
                      value={memberFormData.role}
                      onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="ana@empresa.com"
                      value={memberFormData.email}
                      onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Área / Departamento</label>
                    <input
                      className="form-input"
                      placeholder="Ej. Operaciones"
                      value={memberFormData.department || ''}
                      onChange={(e) => setMemberFormData({ ...memberFormData, department: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Jefe Directo (Opcional)</label>
                    <select
                      className="form-input"
                      value={memberFormData.managerId || ''}
                      onChange={(e) => setMemberFormData({ ...memberFormData, managerId: e.target.value })}
                    >
                      <option value="">-- Sin jefe --</option>
                      {teamMembers
                        .filter(m => !editingMember || m.id !== editingMember.id)
                        .map(m => (
                          <option key={m.id} value={String(m.id)}>{m.name}</option>
                        ))
                      }
                      {orgUsers
                        .filter(u => !teamMembers.some(m => m.email === u.email))
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {/* System Role Dropdown (Only visible to admins when a valid system user exists for this email) */}
                {user?.role === 'admin' && orgUsers.find(u => u.email?.toLowerCase() === memberFormData.email?.toLowerCase()) && (
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-primary)' }}>Nivel de Acceso (Sistema)</label>
                    <select
                      className="form-input"
                      value={memberFormData.systemRole || ''}
                      onChange={(e) => setMemberFormData({ ...memberFormData, systemRole: e.target.value })}
                      disabled={orgUsers.find(u => u.email?.toLowerCase() === memberFormData.email?.toLowerCase())?.id === user.id}
                      title={orgUsers.find(u => u.email?.toLowerCase() === memberFormData.email?.toLowerCase())?.id === user.id ? "No puedes cambiar tu propio rol" : ""}
                    >
                      <option value="admin">Administrador Total</option>
                      <option value="gerente">Gerente (Requiere Aprobación)</option>
                      <option value="agent">Agente (Operador)</option>
                      <option value="guest">Invitado (Solo Lectura)</option>
                    </select>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Controla los permisos de este usuario dentro de la plataforma Konsul.
                    </p>
                  </div>
                )}
              </div>

              {/* Notificaciones del Navegador config */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                <label style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block', marginBottom: '0.25rem', color: 'var(--color-primary)' }}>Notificaciones del Sistema</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Activa las alertas del navegador para recibir avisos de tus tareas pendientes.</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox"
                    id="browser-notifs-toggle"
                    checked={browserNotifications}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        if (!("Notification" in window)) {
                          showAlert("Este navegador no soporta notificaciones de escritorio.", "error");
                          return;
                        }
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                          setBrowserNotifications(true);
                          localStorage.setItem('browser_notifications_enabled', 'true');
                          showAlert("¡Notificaciones activadas con éxito!", "success", "Kônsul");
                        } else {
                          showAlert("Permiso denegado por el navegador. Habilítalo en la configuración de la barra de direcciones.", "warning");
                          setBrowserNotifications(false);
                          localStorage.setItem('browser_notifications_enabled', 'false');
                        }
                      } else {
                        setBrowserNotifications(false);
                        localStorage.setItem('browser_notifications_enabled', 'false');
                      }
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="browser-notifs-toggle" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Activar Notificaciones Push del Navegador
                  </label>
                </div>
              </div>

              {/* Asignación de Pasos section included below profile fields */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                <label style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Asignación de Pasos en Procesos</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Activa o desactiva los pasos específicos en los que participará este colaborador.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.08)', padding: '15px', borderRadius: '12px', backgroundColor: '#fdfbfa' }}>
                  {templates.map(temp => {
                    const isExpanded = expandedTemplates[temp.id];
                    return (
                    <div key={temp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                      <div 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem 0' }}
                        onClick={() => setExpandedTemplates(prev => ({ ...prev, [temp.id]: !prev[temp.id] }))}
                      >
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary-hover)', margin: 0 }}>{temp.title}</h4>
                        <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                      </div>
                      
                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                          {temp.steps.map((step, sIdx) => {
                          const isStepAssigned = Array.isArray(step.assignedTo)
                            ? step.assignedTo.map(String).includes(String(editingMember?.id || 'temp_new_member'))
                            : String(step.assignedTo) === String(editingMember?.id || 'temp_new_member');
                          
                          return (
                            <div key={sIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)' }}>
                              <span style={{ fontSize: '0.85rem' }}>
                                <strong style={{ color: 'var(--color-primary)', marginRight: '6px' }}>Paso {sIdx + 1}</strong>
                                {step.title}
                              </span>
                              <div style={{ display: 'inline-flex', borderRadius: '99px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    modifiedTemplateIds.add(temp.id);
                                    setTemplates(prev => prev.map(t => {
                                      if (t.id !== temp.id) return t;
                                      const updatedSteps = [...t.steps];
                                      const currentAssigned = Array.isArray(updatedSteps[sIdx].assignedTo)
                                        ? updatedSteps[sIdx].assignedTo.map(String)
                                        : updatedSteps[sIdx].assignedTo ? [String(updatedSteps[sIdx].assignedTo)] : [];
                                      const memberId = String(editingMember?.id || 'temp_new_member');
                                      const newAssigned = currentAssigned.includes(memberId) ? currentAssigned : [...currentAssigned, memberId];
                                      updatedSteps[sIdx] = { ...updatedSteps[sIdx], assignedTo: newAssigned };
                                      return { ...t, steps: updatedSteps };
                                    }));
                                  }}
                                  style={{
                                    border: 'none',
                                    padding: '4px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    backgroundColor: isStepAssigned ? 'var(--color-primary)' : '#f3f4f6',
                                    color: isStepAssigned ? 'white' : '#6b7280',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  SÍ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    modifiedTemplateIds.add(temp.id);
                                    setTemplates(prev => prev.map(t => {
                                      if (t.id !== temp.id) return t;
                                      const updatedSteps = [...t.steps];
                                      if (updatedSteps[sIdx]) {
                                        const currentAssigned = Array.isArray(updatedSteps[sIdx].assignedTo)
                                          ? updatedSteps[sIdx].assignedTo.map(String)
                                          : updatedSteps[sIdx].assignedTo ? [String(updatedSteps[sIdx].assignedTo)] : [];
                                        const memberId = String(editingMember?.id || 'temp_new_member');
                                        const newAssigned = currentAssigned.filter(id => id !== memberId);
                                        updatedSteps[sIdx] = { ...updatedSteps[sIdx], assignedTo: newAssigned };
                                      }
                                      return { ...t, steps: updatedSteps };
                                    }));
                                  }}
                                  style={{
                                    border: 'none',
                                    padding: '4px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    backgroundColor: !isStepAssigned ? '#ef4444' : '#f3f4f6',
                                    color: !isStepAssigned ? 'white' : '#6b7280',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  NO
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            </form>
          </div>
          
          <DialogFooter style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', backgroundColor: '#fafafa' }}>
            <DialogClose asChild>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                Cancelar
              </button>
            </DialogClose>
            <button 
              className="btn btn-primary" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              onClick={(e) => {
                e.preventDefault();
                handleSaveMember(e);
              }}
            >
              Guardar Cambios
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MemberModal
        isOpen={showMemberModal}
        onClose={() => {
          setShowMemberModal(false);
          setMemberModalStep(1);
          setEditingMember(null);
        }}
        step={memberModalStep}
        setStep={setMemberModalStep}
        editingMember={editingMember}
        formData={memberFormData}
        setFormData={setMemberFormData}
        handleSave={handleSaveMember}
        teamMembers={teamMembers}
        orgUsers={orgUsers}
        templates={templates}
        expandedTeamTemplates={expandedTeamTemplates}
        setExpandedTeamTemplates={setExpandedTeamTemplates}
        modifiedTemplateIds={modifiedTemplateIds}
        setTemplates={setTemplates}
        showAlert={showAlert}
      />

      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => {
          setShowAddUserModal(false);
          setAddUserModalStep(1);
        }}
        step={addUserModalStep}
        setStep={setAddUserModalStep}
        formData={newUserFormData}
        setFormData={setNewUserFormData}
        handleSave={handleAddOrgUser}
        error={addUserError}
        showAlert={showAlert}
      />
      <SuccessTicketModal 
        isOpen={ticketModal.isOpen} 
        onClose={() => setTicketModal({ ...ticketModal, isOpen: false })} 
        title={ticketModal.title} 
        message={ticketModal.message} 
        ticketId={ticketModal.ticketId} 
        customFields={ticketModal.customFields} 
      />

      <TemplateWizardModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)}
        onSubmit={(prompt, title) => {
          setIsWizardOpen(false);
          generateTemplate(prompt, title);
        }}
      />

      <TemplatePreviewModal 
        isOpen={!!previewTemplate}
        initialData={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onSave={handleSavePreview}
      />

      <Dialog open={showClickupModal} onOpenChange={setShowClickupModal}>
        <DialogContent style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: 0, width: '100%', maxWidth: '48rem', maxHeight: '90vh' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <DialogTitle style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#7b68ee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.75rem' }}>CU</div>
                Configuración de ClickUp
              </DialogTitle>
              <DialogDescription style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Conecta ClickUp y configura las reglas de automatización para tus procesos.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button className="btn btn-secondary" style={{ padding: '0.35rem', borderRadius: '50%', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </DialogClose>
          </div>

          <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Guide Step-by-Step */}
            <div style={{ backgroundColor: 'rgba(123, 104, 238, 0.05)', border: '1px solid rgba(123, 104, 238, 0.15)', borderRadius: '12px', padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#6050dc', fontSize: '0.9rem', fontWeight: 700 }}>Guía de Conexión rápida</h4>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Inicia sesión en tu cuenta de ClickUp.</li>
                <li>Ve a <strong>Configuración &gt; Apps</strong> y localiza la sección <strong>API Token</strong>.</li>
                <li>Haz clic en <strong>Generate</strong>, copia el token `pk_...` y pégalo abajo para validar la conexión.</li>
              </ol>
            </div>

            {/* API Connection Section (Full width, cleaner) */}
            <div style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', backgroundColor: 'white' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} style={{ color: 'var(--color-primary)' }} />
                1. Conexión de API con ClickUp
              </h4>
              <form onSubmit={handleSaveClickupSettings} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '250px', margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Personal API Token</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="pk_..." 
                    value={clickupToken} 
                    onChange={(e) => setClickupToken(e.target.value)} 
                    required 
                    style={{ margin: 0, height: '42px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', width: 'auto' }}>
                  <button type="button" onClick={handleTestClickupConnection} className="btn btn-secondary" style={{ padding: '0 1.5rem', height: '42px', borderRadius: '30px', fontWeight: 600, fontSize: '0.85rem' }} disabled={isTestingClickup}>
                    {isTestingClickup ? 'Probando...' : 'Probar Conexión'}
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem', height: '42px', borderRadius: '30px', fontWeight: 600, fontSize: '0.85rem' }}>
                    Guardar Token
                  </button>
                </div>
              </form>

              {clickupConnectionStatus && (
                <div style={{ 
                  backgroundColor: clickupConnectionStatus.success ? '#e8f5e9' : '#ffebee',
                  color: clickupConnectionStatus.success ? '#2e7d32' : '#c62828',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginTop: '1rem'
                }}>
                  {clickupConnectionStatus.message}
                </div>
              )}
            </div>

            {/* Rule Builder Section (Sentence format, well structured) */}
            <div style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', backgroundColor: 'white' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: 'var(--color-primary)' }} />
                2. Configurar Reglas de Automatización
              </h4>
              
              {!clickupToken ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Debes conectar tu API Token primero para configurar reglas de automatización.</p>
              ) : (
                <form onSubmit={handleCreateClickupRule} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#f9fafb', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  {/* Name of Rule */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Nombre descriptivo de la regla</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej. Iniciar Flujo Onboarding al cerrar negocio" 
                      value={newClickupRule.ruleName} 
                      onChange={(e) => setNewClickupRule({ ...newClickupRule, ruleName: e.target.value })} 
                      required 
                    />
                  </div>

                  {/* Hierarchical selectors */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Workspace / Entorno</label>
                      <select
                        className="form-input"
                        value={selectedClickupTeamId}
                        onChange={(e) => {
                          setSelectedClickupTeamId(e.target.value);
                          setSelectedClickupSpaceId('');
                          setSelectedClickupFolderId('');
                          setSelectedClickupListId('');
                        }}
                        required
                        style={{ cursor: 'pointer' }}
                        disabled={isLoadingClickupData}
                      >
                        <option value="">-- Seleccionar --</option>
                        {clickupTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Espacio (Space)</label>
                      <select
                        className="form-input"
                        value={selectedClickupSpaceId}
                        onChange={(e) => {
                          setSelectedClickupSpaceId(e.target.value);
                          setSelectedClickupFolderId('');
                          setSelectedClickupListId('');
                        }}
                        required
                        style={{ cursor: 'pointer' }}
                        disabled={!selectedClickupTeamId || isLoadingClickupData}
                      >
                        <option value="">-- Seleccionar --</option>
                        {clickupSpaces.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Carpeta (Folder)</label>
                      <select
                        className="form-input"
                        value={selectedClickupFolderId}
                        onChange={(e) => {
                          setSelectedClickupFolderId(e.target.value);
                          setSelectedClickupListId('');
                        }}
                        style={{ cursor: 'pointer' }}
                        disabled={!selectedClickupSpaceId || isLoadingClickupData}
                      >
                        <option value="folderless">-- Listas sin Carpeta --</option>
                        {clickupFolders.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Lista (List)</label>
                      <select
                        className="form-input"
                        value={selectedClickupListId}
                        onChange={(e) => setSelectedClickupListId(e.target.value)}
                        required
                        style={{ cursor: 'pointer' }}
                        disabled={!selectedClickupSpaceId || isLoadingClickupData}
                      >
                        <option value="">-- Seleccionar Lista --</option>
                        {(!selectedClickupFolderId || selectedClickupFolderId === 'folderless' || selectedClickupFolderId === '') ? (
                          clickupFolderlessLists.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))
                        ) : (
                          clickupLists.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Sentence builder */}
                  {selectedClickupListId && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,0,0,0.04)',
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      lineHeight: '2.2rem'
                    }}>
                      <span>Cuando una tarea en la lista cambia al estado</span>
                      <select 
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontWeight: 600,
                          outline: 'none',
                          backgroundColor: '#f3f4f6',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                        value={newClickupRule.clickupStatus} 
                        onChange={(e) => setNewClickupRule({ ...newClickupRule, clickupStatus: e.target.value })}
                        required
                      >
                        {clickupStatuses.map(st => (
                          <option key={st.id || st.status} value={st.status}>{st.status.toUpperCase()}</option>
                        ))}
                      </select>
                      <span>disparar la plantilla de Kônsul</span>
                      <select 
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontWeight: 600,
                          outline: 'none',
                          backgroundColor: '#f3f4f6',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                        value={newClickupRule.templateId} 
                        onChange={(e) => setNewClickupRule({ ...newClickupRule, templateId: e.target.value })}
                        required
                      >
                        <option value="">-- Seleccionar Plantilla --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ alignSelf: 'flex-end', padding: '0.65rem 2rem', borderRadius: '30px', fontWeight: 600, fontSize: '0.85rem' }}
                    disabled={!selectedClickupListId || isLoadingClickupData}
                  >
                    {isLoadingClickupData ? 'Cargando...' : 'Agregar Regla'}
                  </button>
                </form>
              )}
            </div>

            {/* Listado de Reglas Activas */}
            <div style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', backgroundColor: 'white' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700 }}>Reglas de Automatización Activas</h4>
              {clickupRules.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No hay reglas de automatización configuradas.</p>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '250px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Nombre</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Lista ClickUp</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Activador</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Plantilla</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Aprobación</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clickupRules.map(rule => {
                        const associatedTemplate = templates.find(t => t.id === rule.templateId);
                        return (
                          <tr key={rule.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{rule.ruleName}</td>
                            <td style={{ padding: '10px 12px' }}>{rule.clickupListName} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({rule.clickupListId})</span></td>
                            <td style={{ padding: '10px 12px' }}><span className="badge badge-secondary" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>{rule.clickupStatus}</span></td>
                            <td style={{ padding: '10px 12px' }}>{associatedTemplate ? associatedTemplate.title : 'No encontrada'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span 
                                className={`badge ${(!rule.status || rule.status === 'approved') ? 'success' : rule.status === 'rejected' ? 'danger' : 'warning'}`}
                                style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}
                              >
                                {(!rule.status || rule.status === 'approved') ? 'Aprobada' : rule.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                {user?.role === 'admin' && rule.status === 'pending_approval' && (
                                  <>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'rgba(76,175,80,0.1)', color: '#2e7d32', border: 'none', fontWeight: 600, borderRadius: '4px' }} 
                                      onClick={() => handleUpdateClickupRuleStatus(rule.id, 'approved')}
                                    >
                                      Aprobar
                                    </button>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'rgba(244,67,54,0.1)', color: '#c62828', border: 'none', fontWeight: 600, borderRadius: '4px' }} 
                                      onClick={() => handleUpdateClickupRuleStatus(rule.id, 'rejected')}
                                    >
                                      Rechazar
                                    </button>
                                  </>
                                )}
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary)', marginRight: '4px' }} 
                                  onClick={() => {
                                    setConfiguringRule({ ...rule, titlePattern: rule.titlePattern || '{template_title} - {task_name}' });
                                    setShowConfigureRuleModal(true);
                                  }}
                                >
                                  Configurar
                                </button>
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                                  onClick={() => handleDeleteClickupRule(rule.id)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfigureRuleModal} onOpenChange={setShowConfigureRuleModal}>
        <DialogContent style={{ maxWidth: '42rem', borderRadius: '24px', padding: '2rem' }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} style={{ color: 'var(--color-primary)' }} />
              Configurar Ejecución de Automatización
            </DialogTitle>
            <DialogDescription style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Establece las reglas de inicio y estructura de datos para la ejecución del proceso automatizado.
            </DialogDescription>
          </DialogHeader>

          {configuringRule && (
            <form onSubmit={handleUpdateClickupRuleConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
              {/* Rule Summary Info */}
              <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Regla:</strong> {configuringRule.ruleName}</div>
                <div><strong>Lista ClickUp:</strong> {configuringRule.clickupListName} (ID: {configuringRule.clickupListId})</div>
                <div><strong>Evento disparador:</strong> Al cambiar tarea al estado <span className="badge badge-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>{configuringRule.clickupStatus}</span></div>
                <div><strong>Plantilla a iniciar:</strong> {templates.find(t => t.id === configuringRule.templateId)?.title || 'No encontrada'}</div>
              </div>

              {/* Title Pattern Input */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Estructura del Título de la Ejecución</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={configuringRule.titlePattern || ''} 
                    onChange={(e) => setConfiguringRule({ ...configuringRule, titlePattern: e.target.value })} 
                    placeholder="Ej. {template_title} - {task_name}"
                    required
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>Insertar variable:</span>
                    {[
                      { tag: '{task_name}', label: 'Nombre Tarea ClickUp' },
                      { tag: '{template_title}', label: 'Título Plantilla Kônsul' },
                      { tag: '{list_name}', label: 'Nombre Lista ClickUp' },
                      { tag: '{task_id}', label: 'ID Tarea' }
                    ].map(item => (
                      <button
                        key={item.tag}
                        type="button"
                        style={{
                          fontSize: '0.7rem',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(0,0,0,0.08)',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const currentVal = configuringRule.titlePattern || '';
                          setConfiguringRule({ ...configuringRule, titlePattern: currentVal + item.tag });
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 700, color: '#1e40af', display: 'block', marginBottom: '4px' }}>Vista previa del título generado:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e3a8a' }}>
                  {getPreviewTitle()}
                </span>
              </div>

              {/* Date Notice Info (UX/UI Best Practice) */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#166534' }}>
                <div style={{ fontSize: '1.2rem', marginTop: '-2px' }}>ℹ️</div>
                <div>
                  <strong>No se requiere programar fechas:</strong> El inicio de esta ejecución se programará dinámicamente en tiempo real en la fecha y hora exacta en que se registre el cambio de estado en ClickUp. Los plazos relativos de las tareas hijas se calcularán a partir de ese instante.
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ borderRadius: '30px', padding: '0.65rem 1.5rem', fontWeight: 600, fontSize: '0.85rem' }}
                  onClick={() => {
                    setShowConfigureRuleModal(false);
                    setConfiguringRule(null);
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ borderRadius: '30px', padding: '0.65rem 2rem', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Guardar Configuración
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Toast Notification Container */}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '350px',
        pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <div 
            key={t.id} 
            style={{
              pointerEvents: 'auto',
              background: 'white',
              borderLeft: t.type === 'warning' ? '4px solid #f59e0b' : t.type === 'success' ? '4px solid #10b981' : '4px solid var(--color-primary)',
              borderRadius: '8px',
              padding: '12px 16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              animation: 'slideInRight 0.3s ease-out',
              border: '1px solid rgba(0,0,0,0.04)'
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500, lineHeight: 1.4 }}>{t.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <OnDemandModal
        isOpen={showOnDemandModal}
        onClose={() => setShowOnDemandModal(false)}
      />
    </div>
  );
}

export default App;
