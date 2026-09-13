import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
const variants: Record<Variant, string> = {
  primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost', danger: 'btn-danger', success: 'btn-success'
};

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${variants[variant]} ${className}`} {...props}>{children}</button>;
}

export function IconButton({ label, className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={`btn-icon ${className}`} {...props}>{children}</button>;
}

export function PageHeader({ icon: Icon, title, subtitle, actions }: { icon: LucideIcon; title: string; subtitle: string; actions?: ReactNode }) {
  return <header className="page-header"><div className="min-w-0"><h1 className="page-title"><span className="page-title-icon"><Icon size={21} /></span>{title}</h1><p className="page-subtitle">{subtitle}</p></div>{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}</header>;
}

export function Modal({ title, children, onClose, footer, size = 'md' }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-xl', lg: 'max-w-3xl' };
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={event => event.stopPropagation()} className={`modal-card ${sizes[size]}`}><header className="modal-header"><h2 id="modal-title" className="text-base font-extrabold">{title}</h2><IconButton label="Fechar" onClick={onClose}><X size={18} /></IconButton></header><div className="modal-content">{children}</div>{footer && <footer className="modal-footer">{footer}</footer>}</section></div>;
}

export function StatusBadge({ status }: { status: string }) {
  const normalizado = status.toLowerCase();
  const style = normalizado.includes('aprov') || normalizado.includes('concl') || normalizado === 'pago' ? 'badge-success' : normalizado.includes('cancel') || normalizado.includes('erro') ? 'badge-danger' : normalizado.includes('pend') ? 'badge-warning' : 'badge-neutral';
  return <span className={`status-badge ${style}`}>{status}</span>;
}
