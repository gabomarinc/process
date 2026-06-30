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
  user,
  apiUrl
}) {
  const [notifs, setNotifs] = useState(initialNotifications);

  useEffect(() => {
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
    e.stopPropagation();
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
          notifs.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`radix-notif-item ${n.read ? "read" : "unread"}`}
            >
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
              
              <div className="radix-notif-actions">
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

            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

