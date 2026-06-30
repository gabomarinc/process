import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  X,
} from 'lucide-react';
import './alert.css';

const ICONS = {
  information: <Info size={20} />,
  success: <CheckCircle2 size={20} />,
  warning: <AlertTriangle size={20} />,
  error: <XCircle size={20} />,
};

const GradientAlert = forwardRef(
  ({ className = '', variant = 'information', title, description, onClose, ...props }, ref) => {
    
    if (!variant) return null;

    return (
      <motion.div
        ref={ref}
        role="alert"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`gradient-alert ${variant} ${className}`}
        {...props}
      >
        {/* Subtle gradient glow */}
        <div className="gradient-alert-glow" aria-hidden="true" />

        {/* Icon container */}
        <div className={`gradient-alert-icon-container ${variant}`}>
            {ICONS[variant]}
        </div>

        {/* Text Content */}
        <div className="gradient-alert-content">
          {title && <h5 className="gradient-alert-title">{title}</h5>}
          <p className="gradient-alert-desc">{description}</p>
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="gradient-alert-close"
          >
            <X size={16} />
          </button>
        )}
      </motion.div>
    );
  }
);

GradientAlert.displayName = 'GradientAlert';

export { GradientAlert };
