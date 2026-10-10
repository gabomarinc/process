import React from 'react';
import { 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  Layers, 
  TrendingUp, 
  ArrowRight, 
  Sparkles,
  CheckSquare,
  FileText,
  Mail,
  Zap,
  Activity
} from 'lucide-react';
import { getClientTrafficLightStatus } from '../../utils/clientSemaforo';
import './AdminDashboard.css';

export default function AdminDashboard({
  user,
  instances = [],
  templates = [],
  clients = [],
  teamMembers = [],
  kanbanColumns = [],
  onNavigateTab,
  onOpenInstance,
  onOpenClient
}) {
  if (user?.role !== 'admin') return null;

  // 1. Calculate General Metrics
  const totalInstances = instances.length;
  const completedInstances = instances.filter(i => (i.steps || []).every(s => s.isCompleted));
  const activeInstances = instances.filter(i => !(i.steps || []).every(s => s.isCompleted));
  const completionRate = totalInstances > 0 ? Math.round((completedInstances.length / totalInstances) * 100) : 0;

  // 2. Steps Metric
  let totalStepsCount = 0;
  let completedStepsCount = 0;
  let overdueStepsCount = 0;
  const now = new Date();

  instances.forEach(inst => {
    (inst.steps || []).forEach(step => {
      totalStepsCount++;
      if (step.isCompleted) {
        completedStepsCount++;
      } else if (step.dueDate && new Date(step.dueDate) < now) {
        overdueStepsCount++;
      }
    });
  });

  const overallStepsProgress = totalStepsCount > 0 ? Math.round((completedStepsCount / totalStepsCount) * 100) : 0;

  // 3. Client Traffic Light Distribution
  const clientHealth = { green: 0, yellow: 0, red: 0 };
  clients.forEach(c => {
    const sem = getClientTrafficLightStatus(c.checklist);
    if (sem.statusKey === 'green') clientHealth.green++;
    else if (sem.statusKey === 'yellow') clientHealth.yellow++;
    else clientHealth.red++;
  });

  // 4. Team Workload Breakdown
  const memberWorkload = teamMembers.map(member => {
    let assignedActiveSteps = 0;
    let assignedCompletedSteps = 0;

    instances.forEach(inst => {
      (inst.steps || []).forEach(step => {
        const assignedList = Array.isArray(step.assignedTo) 
          ? step.assignedTo.map(String) 
          : step.assignedTo ? [String(step.assignedTo)] : [];

        if (assignedList.includes(String(member.id)) || (member.email && assignedList.includes(member.email.toLowerCase()))) {
          if (step.isCompleted) assignedCompletedSteps++;
          else assignedActiveSteps++;
        }
      });
    });

    return {
      id: member.id,
      name: member.name,
      role: member.role,
      avatar: member.avatar,
      activeSteps: assignedActiveSteps,
      completedSteps: assignedCompletedSteps,
      total: assignedActiveSteps + assignedCompletedSteps
    };
  }).sort((a, b) => b.activeSteps - a.activeSteps);

  // 5. Recent or Critical Executions
  const criticalInstances = [...activeInstances].sort((a, b) => {
    const aPending = (a.steps || []).filter(s => !s.isCompleted && s.dueDate && new Date(s.dueDate) < now).length;
    const bPending = (b.steps || []).filter(s => !s.isCompleted && s.dueDate && new Date(s.dueDate) < now).length;
    return bPending - aPending;
  }).slice(0, 5);

  return (
    <div className="admin-dashboard-root">
      {/* Top Welcome Banner */}
      <div className="admin-dashboard-hero">
        <div className="hero-content">
          <div className="hero-tag">
            <ShieldCheck size={14} /> Panel Exclusivo de Administrador
          </div>
          <h1>Centro de Mando Operativo</h1>
          <p>
            Visión holística en tiempo real sobre la salud de tus procesos, cumplimiento de SLAs, carga de tu equipo y semáforos de clientes.
          </p>
        </div>
        <div className="hero-stats-pill">
          <div className="pill-item">
            <span className="pill-num">{totalInstances}</span>
            <span className="pill-lbl">Procesos Totales</span>
          </div>
          <div className="pill-divider" />
          <div className="pill-item">
            <span className="pill-num" style={{ color: '#27BEA5' }}>{completionRate}%</span>
            <span className="pill-lbl">Tasa de Cierre</span>
          </div>
          <div className="pill-divider" />
          <div className="pill-item">
            <span className="pill-num" style={{ color: overdueStepsCount > 0 ? '#EF4444' : '#10B981' }}>{overdueStepsCount}</span>
            <span className="pill-lbl">Pasos Vencidos</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card" onClick={() => onNavigateTab && onNavigateTab('instances')}>
          <div className="kpi-header">
            <div className="kpi-icon-wrap" style={{ background: 'rgba(39, 190, 165, 0.12)', color: '#27BEA5' }}>
              <Play size={20} />
            </div>
            <span className="kpi-chip active">En Vuelo</span>
          </div>
          <div className="kpi-value">{activeInstances.length}</div>
          <div className="kpi-label">Ejecuciones en Curso</div>
          <div className="kpi-progress-bar">
            <div className="kpi-progress-fill" style={{ width: `${100 - completionRate}%`, background: '#27BEA5' }} />
          </div>
          <div className="kpi-footer-note">
            <span>{completedInstances.length} completadas con éxito</span>
            <ArrowRight size={13} />
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => onNavigateTab && onNavigateTab('kanban')}>
          <div className="kpi-header">
            <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
              <CheckSquare size={20} />
            </div>
            <span className="kpi-chip info">{overallStepsProgress}%</span>
          </div>
          <div className="kpi-value">{completedStepsCount} / {totalStepsCount}</div>
          <div className="kpi-label">Hitos y Pasos Completados</div>
          <div className="kpi-progress-bar">
            <div className="kpi-progress-fill" style={{ width: `${overallStepsProgress}%`, background: '#3B82F6' }} />
          </div>
          <div className="kpi-footer-note">
            <span>{totalStepsCount - completedStepsCount} pasos pendientes por realizar</span>
            <ArrowRight size={13} />
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => onNavigateTab && onNavigateTab('clients')}>
          <div className="kpi-header">
            <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
              <Users size={20} />
            </div>
            <span className="kpi-chip warning">{clients.length} Clientes</span>
          </div>
          <div className="kpi-value-row">
            <span className="health-dot green" title={`${clientHealth.green} Clientes Saludables`}>{clientHealth.green}</span>
            <span className="health-dot yellow" title={`${clientHealth.yellow} Clientes en Advertencia`}>{clientHealth.yellow}</span>
            <span className="health-dot red" title={`${clientHealth.red} Clientes Críticos`}>{clientHealth.red}</span>
          </div>
          <div className="kpi-label">Semáforo de Clientes</div>
          <div className="kpi-health-bar">
            <div style={{ width: `${clients.length ? (clientHealth.green / clients.length) * 100 : 0}%`, background: '#10B981' }} />
            <div style={{ width: `${clients.length ? (clientHealth.yellow / clients.length) * 100 : 0}%`, background: '#F59E0B' }} />
            <div style={{ width: `${clients.length ? (clientHealth.red / clients.length) * 100 : 0}%`, background: '#EF4444' }} />
          </div>
          <div className="kpi-footer-note">
            <span>{clientHealth.red > 0 ? `${clientHealth.red} requieren atención urgente` : 'Todo en regla'}</span>
            <ArrowRight size={13} />
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => onNavigateTab && onNavigateTab('team')}>
          <div className="kpi-header">
            <div className="kpi-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' }}>
              <TrendingUp size={20} />
            </div>
            <span className="kpi-chip purple">{teamMembers.length} Miembros</span>
          </div>
          <div className="kpi-value">{templates.length}</div>
          <div className="kpi-label">Plantillas SOP Operativas</div>
          <div className="kpi-progress-bar">
            <div className="kpi-progress-fill" style={{ width: '100%', background: '#8B5CF6' }} />
          </div>
          <div className="kpi-footer-note">
            <span>Estandarización activa en la organización</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* Main Dual Columns Section */}
      <div className="admin-dashboard-dual">
        {/* Left: Procesos que requieren atención */}
        <div className="admin-dual-card">
          <div className="dual-card-header">
            <div className="dual-title">
              <Activity size={18} color="#27BEA5" />
              <h3>Monitoreo de Procesos Prioritarios</h3>
            </div>
            <span className="dual-count">{criticalInstances.length} en foco</span>
          </div>

          {criticalInstances.length === 0 ? (
            <div className="dual-empty-state">
              <CheckCircle2 size={36} color="#27BEA5" />
              <p>¡Excelente! No hay procesos activos pendientes o retrasados en este momento.</p>
            </div>
          ) : (
            <div className="critical-instances-list">
              {criticalInstances.map(inst => {
                const total = (inst.steps || []).length;
                const done = (inst.steps || []).filter(s => s.isCompleted).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const overdueInInst = (inst.steps || []).filter(s => !s.isCompleted && s.dueDate && new Date(s.dueDate) < now).length;

                return (
                  <div key={inst.id} className="critical-instance-row" onClick={() => onOpenInstance && onOpenInstance(inst.id)}>
                    <div className="critical-inst-left">
                      <div className="inst-avatar-mini">{inst.companionAvatar || '⚡'}</div>
                      <div className="inst-info-col">
                        <h4>{inst.instanceName}</h4>
                        <span className="inst-sub">{inst.title} • {inst.category || 'General'}</span>
                      </div>
                    </div>

                    <div className="critical-inst-right">
                      {overdueInInst > 0 && (
                        <span className="badge-overdue-alert">
                          <AlertTriangle size={12} /> {overdueInInst} vencido{overdueInInst > 1 ? 's' : ''}
                        </span>
                      )}
                      <div className="inst-mini-progress">
                        <div className="mini-progress-track">
                          <div className="mini-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="mini-pct">{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Carga operativa del Equipo y Semáforo Clientes */}
        <div className="admin-dual-card">
          <div className="dual-card-header">
            <div className="dual-title">
              <Users size={18} color="#8B5CF6" />
              <h3>Carga de Trabajo del Equipo</h3>
            </div>
            <button className="dual-header-link" onClick={() => onNavigateTab && onNavigateTab('team')}>
              Ver Directorio <ArrowRight size={13} />
            </button>
          </div>

          <div className="team-workload-list">
            {memberWorkload.slice(0, 5).map(m => {
              const maxSteps = Math.max(...memberWorkload.map(x => x.activeSteps), 1);
              const barPct = Math.round((m.activeSteps / maxSteps) * 100);

              return (
                <div key={m.id} className="team-workload-row">
                  <div className="workload-member-info">
                    <div className="member-avatar-circle">
                      {m.avatar || m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="member-name-txt">{m.name}</div>
                      <span className="member-role-txt">{m.role}</span>
                    </div>
                  </div>

                  <div className="workload-bar-wrap">
                    <div className="workload-bar-track">
                      <div className="workload-bar-fill" style={{ width: `${barPct}%` }} />
                    </div>
                    <span className="workload-count-badge">
                      <strong>{m.activeSteps}</strong> activas
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Client Health Summary Footer */}
          <div className="admin-card-inner-footer">
            <div className="inner-footer-left">
              <span className="footer-title">Resumen de Clientes Activos</span>
              <p className="footer-desc">
                {clientHealth.green} verdes • {clientHealth.yellow} advertencias • {clientHealth.red} bloqueados
              </p>
            </div>
            <button className="btn-go-clients" onClick={() => onNavigateTab && onNavigateTab('clients')}>
              Ver Semáforos <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
