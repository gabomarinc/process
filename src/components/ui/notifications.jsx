"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { BellRing, MessageCircle, AlertTriangle, CheckCircle, Trash2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import "./notifications.css";

const defaultNotifications = [
  { id: 1, type: "message", message: "Nuevo mensaje de John", timestamp: "hace 2m" },
  { id: 2, type: "success", message: "Reporte generado exitosamente", timestamp: "hace 10m", instanceId: 1 },
  { id: 3, type: "alert", message: "Mantenimiento del servidor programado", timestamp: "hace 1h", read: true },
];

export default function Notifications({
  initialNotifications = defaultNotifications,
  icon,
  onNavigate,
  onCompleteStep,
  user,
  apiUrl,
  addToast
}) {
  const [notifs, setNotifs] = useState(initialNotifications);

  useEffect(() => {
    const fetchNotifs = () => {
      if (document.visibilityState !== 'visible') return;
      if (user && user.id && apiUrl) {
        fetch(`${apiUrl}/notifications/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${user.token || localStorage.getItem('token')}`
          }
        })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setNotifs(data);
          }
        })
        .catch(err => console.error('Error fetching notifications:', err));
      }
    };

    // Initial fetch if page is currently visible
    if (document.visibilityState === 'visible') {
      fetchNotifs();
    }
    
    // Poll every 60 seconds
    const intervalId = setInterval(fetchNotifs, 60000);
    
    // Refresh immediately when document visibility changes to visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifs();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for custom event to trigger immediate refresh
    const handleRefresh = () => fetchNotifs();
    window.addEventListener('notifications-updated', handleRefresh);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('notifications-updated', handleRefresh);
    };
  }, [user, apiUrl]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case "message":
        return <MessageCircle size={20} color="#3b82f6" />;
      case "alert":
        return <AlertTriangle size={20} color="#f59e0b" />;
      case "success":
        return <CheckCircle size={20} color="#10b981" />;
      default:
        return <BellRing size={20} color="#6b7280" />;
    }
  };

  const markAsRead = async (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation();
    // Optimistic update
    setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n));
    if (apiUrl) {
      try {
        await fetch(`${apiUrl}/notifications/${id}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}`
          }
        });
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }
  };

  const requestHelp = async (e, n) => {
    e.stopPropagation();
    const instId = n.instance_id || n.instanceId;
    const sId = n.step_id || n.stepId;
    const helpMsg = `${user?.name || 'Un compañero'} solicita una mano en: "${n.message || 'Paso'}"`;
    if (apiUrl) {
      try {
        await fetch(`${apiUrl}/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            id: `help-notif-${sId}-${Date.now()}`,
            instanceId: instId,
            stepId: sId,
            instanceName: n.instance_name || 'Proceso',
            stepTitle: n.step_title || 'Paso',
            message: helpMsg,
            type: 'alert'
          })
        });
        window.dispatchEvent(new Event('notifications-updated'));
        markAsRead(e, n.id);
        if (addToast) addToast("¡Pedido de ayuda enviado al equipo! Un compañero vendrá al rescate.", "success");
      } catch (err) {
        console.error('Error requesting help:', err);
      }
    }
  };

  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    // Optimistic update
    setNotifs(notifs.filter(n => n.id !== id));
    if (apiUrl) {
      try {
        await fetch(`${apiUrl}/notifications/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}`
          }
        });
      } catch (err) {
        console.error('Error deleting notification:', err);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="notifications-trigger">
        {icon || <BellRing size={20} />}
        {unreadCount > 0 && (
          <span className="notifications-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end" 
        className="notifications-content"
      >
        {notifs.length === 0 ? (
          <DropdownMenuItem className="radix-notif-item-empty">
            No tienes notificaciones
          </DropdownMenuItem>
        ) : (
          notifs.map((n) => {
            const instId = n.instance_id || n.instanceId;
            const stepId = n.step_id || n.stepId;
            return (
              <DropdownMenuItem
                key={n.id}
                className={`radix-notif-item ${n.read ? "read" : "unread"}`}
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                  <div 
                    style={{ display: 'flex', gap: '0.75rem', flexGrow: 1 }} 
                    onClick={() => onNavigate && onNavigate(n)}
                  >
                    <div className="radix-notif-item-icon">{getIcon(n.type)}</div>
                    <div className="radix-notif-item-body">
                      <span className="radix-notif-item-message">{n.message}</span>
                      {n.timestamp && (
                        <span className="radix-notif-item-time">{new Date(n.timestamp).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="radix-notif-actions" style={{ flexShrink: 0 }}>
                    {!n.read && (
                      <button 
                        className="radix-notif-action-btn success" 
                        onClick={(e) => markAsRead(e, n.id)}
                        title="Marcar como leída"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button 
                      className="radix-notif-action-btn" 
                      onClick={(e) => deleteNotif(e, n.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {instId && stepId && !n.read && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', marginLeft: '2.25rem' }} onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (onCompleteStep) {
                          await onCompleteStep(instId, stepId);
                        }
                        markAsRead(e, n.id);
                      }}
                      style={{ background: '#e8f7f5', color: '#27bea7', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Sí, listo
                    </button>
                    <button 
                      onClick={(e) => requestHelp(e, n)}
                      style={{ background: '#fdf3f2', color: '#b58b53', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      No, necesito ayuda
                    </button>
                  </div>
                )}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

