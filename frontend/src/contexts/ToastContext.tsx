import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void }
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId.current;
    setToasts(current => [...current, { id, message, type }]);
    window.setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), 4200);
  }, []);

  const styles = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    error: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  };
  const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed right-4 top-20 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map(item => {
          const Icon = icons[item.type];
          return <div key={item.id} className={`animate-toast-in flex items-center gap-3 rounded-2xl border p-3.5 shadow-xl backdrop-blur-xl ${styles[item.type]}`}>
            <Icon size={19} className="shrink-0" />
            <p className="flex-1 text-sm font-semibold">{item.message}</p>
            <button onClick={() => setToasts(current => current.filter(toast => toast.id !== item.id))} aria-label="Fechar notificação" className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"><X size={16} /></button>
          </div>;
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider.');
  return context;
}
