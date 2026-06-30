import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GradientAlert } from '../components/ui/alert';

const AlertContext = createContext(null);

let alertIdCounter = 0;

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const showAlert = useCallback((message, variant = 'information', title = '') => {
    const id = `alert_${++alertIdCounter}`;
    
    // Auto capitalize title based on variant if not provided
    const displayTitle = title || (variant.charAt(0).toUpperCase() + variant.slice(1));
    
    setAlerts(prev => [...prev, { id, variant, title: displayTitle, description: message }]);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return (
    <AlertContext.Provider value={showAlert}>
      {children}
      <div className="gradient-alert-container">
        <AnimatePresence>
          {alerts.map(({ id, variant, title, description }) => (
            <GradientAlert
              key={id}
              variant={variant}
              title={title}
              description={description}
              onClose={() => removeAlert(id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
