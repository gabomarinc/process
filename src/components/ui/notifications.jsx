"use client";

import * as React from "react";
import { BellRing, MessageCircle, AlertTriangle, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import "./notifications.css";

const defaultNotifications = [
  { id: 1, type: "message", message: "Nuevo mensaje de John", timestamp: "hace 2m" },
  { id: 2, type: "success", message: "Reporte generado exitosamente", timestamp: "hace 10m" },
  { id: 3, type: "alert", message: "Mantenimiento del servidor programado", timestamp: "hace 1h", read: true },
];

export default function Notifications({
  notifications = defaultNotifications,
  icon,
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;

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
        align="end" // Align to the end (right) since it's next to Mi Cuenta
        className="notifications-content"
      >
        {notifications.length === 0 ? (
          <DropdownMenuItem className="notification-item-empty">
            No tienes notificaciones
          </DropdownMenuItem>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`notification-item ${n.read ? "read" : "unread"}`}
            >
              <div className="notification-item-icon">{getIcon(n.type)}</div>
              <div className="notification-item-body">
                <span className="notification-item-message">{n.message}</span>
                {n.timestamp && (
                  <span className="notification-item-time">{n.timestamp}</span>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
