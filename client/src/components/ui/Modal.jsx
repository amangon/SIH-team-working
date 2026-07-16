import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils';

/** Accessible modal with backdrop blur and spring animation */
export function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'glass w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl',
              wide ? 'max-w-3xl' : 'max-w-lg'
            )}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose} className="btn-ghost !p-1.5 rounded-lg"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
