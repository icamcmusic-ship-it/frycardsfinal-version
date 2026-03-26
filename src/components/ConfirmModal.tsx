import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-yellow-400 hover:bg-yellow-500 text-black',
    info: 'bg-blue-500 hover:bg-blue-600 text-white'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[var(--surface)] border-4 border-black rounded-2xl p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative background element */}
          <div className={`absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 rounded-full opacity-10 ${variant === 'danger' ? 'bg-red-500' : variant === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />

          <div className="flex items-start gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-4 border-black shrink-0 ${variant === 'danger' ? 'bg-red-100 text-red-600' : variant === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-black uppercase tracking-tight leading-none mb-2">{title}</h3>
              <p className="text-sm font-bold text-slate-600 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-3 px-4 font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none ${colors[variant]}`}
            >
              {confirmText}
            </button>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-black/40" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
