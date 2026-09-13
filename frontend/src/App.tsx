// src/App.tsx
import { useEffect, useState } from 'react';
import { Search, Command, Package, Boxes, Users, ShoppingCart, FileText, ClipboardList, X } from 'lucide-react';
import { Navegacao, type AbaNavegacao } from './components/Navegacao';
import { TelaPDVBalcao } from './pages/PDV';
import { TelaGestaoEstoque } from './pages/Estoque';
import { TelaClientes } from './pages/Clientes';
import { TelaProdutos } from './pages/Produtos';
import { TelaHistoricoVendas } from './pages/Vendas';
import { TelaOrcamentos } from './pages/Orcamentos';
import { produtoService, type Produto } from './services/produto.service';
import { pessoaService, type Pessoa } from './services/pessoa.service';

function App() {
  const [abaAtiva, setAbaAtiva] = useState<AbaNavegacao>('pdv');
  const [paletteAberta, setPaletteAberta] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Pessoa[]>([]);

  useEffect(() => {
    const abrirPalette = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteAberta(true);
      }
    };
    window.addEventListener('keydown', abrirPalette);
    return () => window.removeEventListener('keydown', abrirPalette);
  }, []);

  useEffect(() => {
    if (!paletteAberta || produtos.length || clientes.length) return;
    Promise.all([produtoService.listar(), pessoaService.listar()])
      .then(([listaProdutos, listaClientes]) => { setProdutos(listaProdutos); setClientes(listaClientes); })
      .catch(() => undefined);
  }, [paletteAberta, produtos.length, clientes.length]);

  const navegar = (aba: AbaNavegacao) => {
    setAbaAtiva(aba);
    setPaletteAberta(false);
    setConsulta('');
  };
  const termo = consulta.toLowerCase().trim();
  const produtosEncontrados = termo ? produtos.filter(item => `${item.nome} ${item.sku} ${item.ean ?? ''}`.toLowerCase().includes(termo)).slice(0, 4) : [];
  const clientesEncontrados = termo ? clientes.filter(item => `${item.nome_fantasia} ${item.cnpj_cpf ?? ''}`.toLowerCase().includes(termo)).slice(0, 3) : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-red-500 selection:text-white dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-300">
      {/* Componente Modular de Navegação */}
      <Navegacao abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} abrirBusca={() => setPaletteAberta(true)} />

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 max-w-7xl w-full mx-auto">
        {abaAtiva === 'pdv' && <TelaPDVBalcao />}
        {abaAtiva === 'estoque' && <TelaGestaoEstoque />}
        {abaAtiva === 'clientes' && <TelaClientes />}
        {abaAtiva === 'produtos' && <TelaProdutos />}
        {abaAtiva === 'orcamentos' && <TelaOrcamentos />}
        {abaAtiva === 'vendas' && <TelaHistoricoVendas />}
      </main>

      {paletteAberta && <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/40 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setPaletteAberta(false)}>
        <div role="dialog" aria-modal="true" aria-label="Busca global" onMouseDown={event => event.stopPropagation()} className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
            <Search className="text-red-500" size={20} />
            <input autoFocus value={consulta} onChange={event => setConsulta(event.target.value)} onKeyDown={event => event.key === 'Escape' && setPaletteAberta(false)} placeholder="Navegue, procure produtos ou clientes..." className="h-16 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400 dark:text-white" />
            <button onClick={() => setPaletteAberta(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar busca"><X size={18} /></button>
          </div>
          <div className="max-h-[55vh] overflow-y-auto p-3">
            {!termo && <><p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Navegação rápida</p>
              {[['pdv', 'PDV Balcão', ShoppingCart], ['estoque', 'Estoque', Package], ['produtos', 'Produtos', Boxes], ['clientes', 'Clientes', Users], ['orcamentos', 'Orçamentos', ClipboardList], ['vendas', 'Histórico de vendas', FileText]].map(([id, label, Icon]) => { const ItemIcon = Icon as typeof ShoppingCart; return <button key={id as string} onClick={() => navegar(id as AbaNavegacao)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300"><ItemIcon size={18} /><span className="flex-1">{label as string}</span><span className="text-xs text-slate-400">Abrir</span></button>; })}</>}
            {produtosEncontrados.length > 0 && <PaletteGroup title="Produtos" items={produtosEncontrados.map(item => ({ title: item.nome, detail: `${item.sku || '-'} · R$ ${Number(item.valor_preco_fixado).toFixed(2)}` }))} onClick={() => navegar('pdv')} />}
            {clientesEncontrados.length > 0 && <PaletteGroup title="Clientes" items={clientesEncontrados.map(item => ({ title: item.nome_fantasia, detail: item.cnpj_cpf || item.whatsapp || 'Pessoa cadastrado' }))} onClick={() => navegar('clientes')} />}
            {termo && !produtosEncontrados.length && !clientesEncontrados.length && <p className="px-3 py-8 text-center text-sm text-slate-500">Nada encontrado para “{consulta}”.</p>}
          </div>
          <div className="flex gap-3 border-t border-slate-200 px-5 py-3 text-[11px] text-slate-400 dark:border-slate-800"><span className="flex items-center gap-1"><Command size={12} /> K</span><span>para abrir de qualquer tela</span></div>
        </div>
      </div>}
    </div>
  );
}

function PaletteGroup({ title, items, onClick }: { title: string; items: { title: string; detail: string }[]; onClick: () => void }) {
  return <section className="py-1"><p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>{items.map(item => <button key={`${title}-${item.title}`} onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-red-50 dark:hover:bg-red-500/10"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-red-600 dark:bg-slate-800 dark:text-red-400"><Search size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</span><span className="block truncate text-xs text-slate-500">{item.detail}</span></span></button>)}</section>;
}

export default App;
