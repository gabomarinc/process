import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { useAlert } from '../../contexts/AlertContext';

export function ReactivaLeadsModal({ isOpen, onClose, user, templates, fileStore }) {
  const showAlert = useAlert();
  const [activeTab, setActiveTab] = useState('connection');
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [rules, setRules] = useState([]);
  const [rlTemplates, setRlTemplates] = useState([]);
  
  // Rule form state
  const [newRule, setNewRule] = useState({
    ruleName: '',
    konsulTemplateId: '',
    reactivaleadsTemplateId: '',
    nameColumn: 'Nombre',
    phoneColumn: 'Telefono'
  });

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/integrations/reactivaleads/rules', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchRlTemplates = async () => {
    try {
      const res = await fetch('/api/integrations/reactivaleads/templates', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRlTemplates(data);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRlTemplates();
      fetchRules();
    }
  }, [isOpen]);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!apiKey) return;
    setIsConnecting(true);
    try {
      const res = await fetch('/api/integrations/reactivaleads/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ token: apiKey })
      });
      
      if (res.ok) {
        await fetch('/api/integrations/reactivaleads/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ token: apiKey })
        });
        setIsConnected(true);
        showAlert('Conexión con ReactivaLeads establecida exitosamente', 'success');
        fetchRlTemplates();
        setActiveTab('rules');
      } else {
        const data = await res.json();
        showAlert(data.error || 'API Key inválida', 'error');
      }
    } catch (err) {
      showAlert('Error de red al conectar', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ruleName: newRule.ruleName,
        konsulTemplateId: newRule.konsulTemplateId,
        reactivaleadsTemplateId: newRule.reactivaleadsTemplateId,
        mapping: { nameColumn: newRule.nameColumn, phoneColumn: newRule.phoneColumn }
      };

      const res = await fetch('/api/integrations/reactivaleads/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showAlert('Regla añadida con éxito', 'success');
        setNewRule({ ruleName: '', konsulTemplateId: '', reactivaleadsTemplateId: '', nameColumn: 'Nombre', phoneColumn: 'Telefono' });
        fetchRules();
      } else {
        showAlert('Error al añadir la regla', 'error');
      }
    } catch(err) {
      showAlert('Error de servidor', 'error');
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      const res = await fetch(`/api/integrations/reactivaleads/rules/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        showAlert('Regla eliminada', 'success');
        fetchRules();
      }
    } catch(e) {
      showAlert('Error al eliminar', 'error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent style={{ maxWidth: '600px', padding: '0', overflow: 'hidden' }}>
        <DialogHeader style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>RL</div>
            Integración con ReactivaLeads
          </DialogTitle>
          <DialogDescription>
            Conecta tu cuenta y configura reglas para enviar notificaciones masivas automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <button 
            onClick={() => setActiveTab('connection')}
            style={{ flex: 1, padding: '1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'connection' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'connection' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
          >
            1. Conexión API
          </button>
          <button 
            onClick={() => { if(isConnected) setActiveTab('rules') }}
            style={{ flex: 1, padding: '1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'rules' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'rules' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: 600, cursor: isConnected ? 'pointer' : 'not-allowed', opacity: isConnected ? 1 : 0.5 }}
            disabled={!isConnected}
          >
            2. Reglas de Automatización
          </button>
        </div>

        <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto', background: '#fafafa' }}>
          {activeTab === 'connection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Para conectar con ReactivaLeads, necesitas tu API Key generada desde su panel de desarrollo.
              </p>
              
              <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>API Key (x-api-key)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Pega tu API Key aquí..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" disabled={isConnecting || !apiKey} style={{ width: '100%' }}>
                  {isConnecting ? 'Verificando...' : 'Conectar y Validar'}
                </button>
              </form>
              
              {isConnected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '1rem', background: 'rgba(76,175,80,0.1)', color: '#2e7d32', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle size={18} /> Conectado exitosamente con ReactivaLeads
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Nueva Regla de Disparo</h4>
                <form onSubmit={handleAddRule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Nombre de la Regla</label>
                    <input className="form-input" required placeholder="Ej. Lanzamiento Campaña Mensual" value={newRule.ruleName} onChange={e => setNewRule({...newRule, ruleName: e.target.value})} />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Plantilla Kônsul (Disparador)</label>
                      <select className="form-input" required value={newRule.konsulTemplateId} onChange={e => setNewRule({...newRule, konsulTemplateId: e.target.value})}>
                        <option value="">-- Seleccionar Proceso --</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                    </div>
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Plantilla ReactivaLeads</label>
                      <select className="form-input" required value={newRule.reactivaleadsTemplateId} onChange={e => setNewRule({...newRule, reactivaleadsTemplateId: e.target.value})}>
                        <option value="">-- Plantilla Mensaje --</option>
                        {Array.isArray(rlTemplates) ? rlTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>) : <option value="default">Plantilla por Defecto</option>}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Columna de Nombre (Excel)</label>
                      <input className="form-input" required placeholder="Nombre" value={newRule.nameColumn} onChange={e => setNewRule({...newRule, nameColumn: e.target.value})} />
                    </div>
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Columna de Teléfono (Excel)</label>
                      <input className="form-input" required placeholder="Telefono" value={newRule.phoneColumn} onChange={e => setNewRule({...newRule, phoneColumn: e.target.value})} />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}>
                    <Plus size={16} /> Crear Regla
                  </button>
                </form>
              </div>

              <div>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Reglas Activas</h4>
                {rules.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay reglas configuradas.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {rules.map(r => {
                      const t = templates.find(temp => temp.id === r.konsul_template_id);
                      return (
                        <div key={r.id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{r.rule_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <span>{t ? t.title : r.konsul_template_id}</span>
                              <ArrowRight size={12} />
                              <span>ReactivaLeads ({r.reactivaleads_template_id})</span>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteRule(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
