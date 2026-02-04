import { useState } from 'react';
import { AlertCircle, XCircle, Info, X, CheckCircle } from 'lucide-react';

const variants = {
  error: {
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    Icon: XCircle,
  },
  warn: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-300',
    Icon: AlertCircle,
  },
  info: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-300',
    Icon: Info,
  },
  success: {
    bg: 'bg-green-500/20',
    text: 'text-green-300',
    Icon: CheckCircle,
  },
};

export default function ErrorBanner({ message, variant = 'error', className = '', dismissible = false, onClose }) {
  const [open, setOpen] = useState(true);
  const v = variants[variant] ?? variants.error;
  const Icon = v.Icon;
  if (!open) return null;
  const handleClose = () => {
    setOpen(false);
    onClose && onClose();
  };
  return (
    <div className={`${v.bg} ${v.text} p-4 rounded-lg flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-3">
        <Icon className="h-5 w-5" />
        <span className="text-sm">{message}</span>
      </div>
      {dismissible && (
        <button aria-label="Dismiss" onClick={handleClose} className="p-1 rounded hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
