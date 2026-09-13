// src/components/Navegacao.tsx
import React, { useState } from 'react';
import { ShoppingCart, Package, Boxes, Users, FileText, ClipboardList, Menu, X, Wrench, Moon, Sun, Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export type AbaNavegacao = 'pdv' | 'estoque' | 'clientes' | 'produtos' | 'orcamentos' | 'vendas';

interface NavegacaoProps {
  abaAtiva: AbaNavegacao;
  setAbaAtiva: (aba: AbaNavegacao) => void;
  abrirBusca: () => void;
}

export const Navegacao: React.FC<NavegacaoProps> = ({ abaAtiva, setAbaAtiva, abrirBusca }) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const itensMenu = [
    { id: 'pdv' as AbaNavegacao, rotulo: 'PDV Balcão', icone: ShoppingCart },
    { id: 'estoque' as AbaNavegacao, rotulo: 'Estoque', icone: Package },
    { id: 'clientes' as AbaNavegacao, rotulo: 'Clientes', icone: Users },
    { id: 'produtos' as AbaNavegacao, rotulo: 'Produtos', icone: Boxes },
    { id: 'orcamentos' as AbaNavegacao, rotulo: 'Orçamentos', icone: ClipboardList },
    { id: 'vendas' as AbaNavegacao, rotulo: 'Histórico de Vendas', icone: FileText }
  ];

  const mudarAba = (aba: AbaNavegacao) => {
    setAbaAtiva(aba);
    setMenuAberto(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/85 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logotipo da Loja */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => mudarAba('pdv')}>
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center font-bold text-white shadow-lg shadow-red-600/30">
            <Wrench size={20} />
          </div>
          <div>
            <span className="block text-base font-extrabold leading-none tracking-wide text-slate-900 dark:text-white">AutoPeças</span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Sistema de Gestão & PDV</span>
          </div>
        </div>

        {/* Menu Desktop */}
        <nav className="hidden lg:flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5 dark:border-slate-800/80 dark:bg-slate-900/80">
          {itensMenu.map((item) => {
            const Icone = item.icone;
            const estaAtivo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => mudarAba(item.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  estaAtivo
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <Icone size={16} />
                {item.rotulo}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <button onClick={abrirBusca} className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400" aria-label="Abrir busca global"><Search size={15} /><span className="hidden xl:inline">Buscar</span><kbd className="hidden xl:inline rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">⌘K</kbd></button>
          <button onClick={toggleTheme} className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}>{isDark ? <Sun size={18} className="animate-theme-in" /> : <Moon size={18} className="animate-theme-in" />}</button>
          <button onClick={() => setMenuAberto(!menuAberto)} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:text-red-600 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" aria-label="Abrir menu">{menuAberto ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>

      {/* Menu Mobile Deslizante */}
      {menuAberto && (
        <div className="lg:hidden space-y-2 border-t border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-950">
          {itensMenu.map((item) => {
            const Icone = item.icone;
            const estaAtivo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => mudarAba(item.id)}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 ${
                  estaAtivo
                    ? 'bg-red-600 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icone size={18} />
                {item.rotulo}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
