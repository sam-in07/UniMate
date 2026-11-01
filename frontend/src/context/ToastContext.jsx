import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast({ message: msg, type: 'success', duration: dur }),
    error: (msg, dur) => addToast({ message: msg, type: 'error', duration: dur || 6000 }),
    info: (msg, dur) => addToast({ message: msg, type: 'info', duration: dur })
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-colors ${
                t.type === 'success'
                  ? 'bg-emerald-500/90 text-white border-emerald-400'
                  : t.type === 'error'
                  ? 'bg-rose-500/90 text-white border-rose-400'
                  : 'bg-slate-800/95 text-white border-slate-700'
              }`}
            >
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
              {t.type === 'info' && <Info className="w-5 h-5 shrink-0 mt-0.5 text-brand-300" />}

              <p className="text-sm font-medium leading-relaxed flex-1">{t.message}</p>

              <button
                onClick={() => removeToast(t.id)}
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

