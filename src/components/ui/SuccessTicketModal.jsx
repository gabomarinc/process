import React, { useState, useEffect } from "react";
import { Button } from "./button";
import "./SuccessTicketModal.css";

const CheckCircleIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ConfettiExplosion = () => {
  const confettiCount = 100;
  const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#f97316"];

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden="true">
      {Array.from({ length: confettiCount }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '8px',
            height: '16px',
            left: `${Math.random() * 100}%`,
            top: `${-20 + Math.random() * 10}%`,
            backgroundColor: colors[i % colors.length],
            transform: `rotate(${Math.random() * 360}deg)`,
            animation: `fall ${2.5 + Math.random() * 2.5}s ${Math.random() * 2}s linear forwards`,
          }}
        />
      ))}
    </div>
  );
};

const DashedLine = () => (
  <div className="ticket-dashed-line" aria-hidden="true" />
);



export const SuccessTicketModal = ({ isOpen, onClose, title, message, ticketId, date, customFields = [] }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const mountTimer = setTimeout(() => setShowConfetti(true), 100);
      const unmountTimer = setTimeout(() => setShowConfetti(false), 6000);
      // Auto close after 5 seconds if not closed manually
      const autoCloseTimer = setTimeout(() => onClose(), 5000);
      return () => {
        clearTimeout(mountTimer);
        clearTimeout(unmountTimer);
        clearTimeout(autoCloseTimer);
      };
    } else {
      setShowConfetti(false);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formattedDate = new Intl.DateTimeFormat("es-ES", {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date || new Date()).replace(',', ' •');

  return (
    <div className="success-ticket-overlay" onClick={onClose}>
      {showConfetti && <ConfettiExplosion />}
      
      <div className="success-ticket-container" onClick={(e) => e.stopPropagation()}>
        <div className="ticket-cutout-left" />
        <div className="ticket-cutout-right" />

        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="ticket-icon-container">
            <CheckCircleIcon className="ticket-icon" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '1rem', color: 'var(--color-primary-hover)' }}>{title || "¡Completado!"}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            {message || "La acción se ha realizado con éxito."}
          </p>
        </div>

        <div style={{ padding: '0 2rem 2rem 2rem' }}>
          <DashedLine />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Acción</p>
              <p style={{ fontFamily: 'monospace', fontWeight: '500', fontSize: '0.9rem' }}>{ticketId || `TKT-${Math.floor(Math.random()*10000)}`}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Fecha & Hora</p>
              <p style={{ fontWeight: '500', fontSize: '0.9rem' }}>{formattedDate}</p>
            </div>
          </div>

          {customFields.length > 0 && (
            <div style={{ backgroundColor: 'rgba(0,0,0,0.03)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {customFields.map((field, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '500' }}>{field.label}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: field.mono ? 'monospace' : 'inherit' }}>{field.value}</p>
                </div>
              ))}
            </div>
          )}

          <DashedLine />

          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0 0.5rem' }}><img src="https://konsul.digital/images/Konsul-logo-general.png" alt="Kônsul Logo" style={{ height: '28px', objectFit: 'contain' }} /></div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
