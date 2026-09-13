import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Edit3, Loader2, Search, Trash2, X } from 'lucide-react';
import { pessoaService, type Pessoa } from '../../services/pessoa.service';
import { produtoService, type Produto } from '../../services/produto.service';
import { orcamentoService, type Orcamento, type OrcamentoItem, type StatusOrcamento } from '../../services/orcamento.service';
import { EmptyState, TableSkeleton } from '../../components/Feedback';

type ItemFormulario = OrcamentoItem;
const moeda = (valor: number) => `R$ ${Number(valor || 0).toFixed(2)}`;

export function TelaOrcamentos() {
  const [clientes, setClientes] = useState<Pessoa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [itens, setItens] = useState<ItemFormulario[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [desconto, setDesconto] = useState(0);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState<StatusOrcamento | ''>('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [orcamentoParaCancelar, setOrcamentoParaCancelar] = useState<Orcamento | null>(null);
  const [orcamentoParaAprovar, setOrcamentoParaAprovar] = useState<Orcamento | null>(null);
  const [formaPagamento, setFormaPagamento] = useState('PIX');

  const carregarListagem = async () => {
    try {
      setCarregando(true);
      setOrcamentos(await orcamentoService.listar({ busca, periodo, status: statusFiltro || undefined }));
    } catch {
      setAlerta({ tipo: 'erro', texto: 'Não foi possível carregar os orçamentos.' });
    } finally { setCarregando(false); }
  };

  useEffect(() => { carregarListagem(); }, [periodo, statusFiltro]);
  useEffect(() => {
    Promise.all([pessoaService.listar({ cliente: true }), produtoService.listar()])
      .then(([listaClientes, listaProdutos]) => { setClientes(listaClientes); setProdutos(listaProdutos); })
      .catch(() => setAlerta({ tipo: 'erro', texto: 'Não foi possível carregar clientes e produtos.' }));
  }, []);

  const subtotal = useMemo(() => itens.reduce((total, item) => total + Number(item.quantidade) * Number(item.valor_unitario), 0), [itens]);
  const total = Math.max(0, subtotal - desconto);
  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.trim().toLowerCase();
    if (!termo) return produtos.slice(0, 8);
    return produtos.filter(produto => `${produto.nome} ${produto.sku || ''} ${produto.ean || ''}`.toLowerCase().includes(termo)).slice(0, 8);
  }, [buscaProduto, produtos]);

  const adicionarProduto = (produto: Produto) => {
    const existente = itens.find(item => item.produto_id === produto.id);
    if (existente) {
      setItens(itens.map(item => item.produto_id === produto.id ? { ...item, quantidade: Number(item.quantidade) + 1 } : item));
    } else {
      setItens([...itens, { produto_id: produto.id, produto_nome: produto.nome, sku: produto.sku, unidade_comercial: produto.unidade_comercial, estoque_atual: produto.estoque_atual, quantidade: 1, valor_unitario: Number(produto.valor_preco_fixado), subtotal: Number(produto.valor_preco_fixado) }]);
    }
    setBuscaProduto('');
  };
  const alterarItem = (produtoId: number, campo: 'quantidade' | 'valor_unitario', valor: number) => setItens(itens.map(item => item.produto_id === produtoId ? { ...item, [campo]: Math.max(0, valor) } : item));
  const limparFormulario = () => { setItens([]); setClienteId(null); setDesconto(0); setEditandoId(null); setBuscaProduto(''); };
  const salvar = async () => {
    if (!itens.length) { setAlerta({ tipo: 'erro', texto: 'Adicione ao menos um produto ao orçamento.' }); return; }
    try {
      setSalvando(true);
      const payload = { cliente_id: clienteId, desconto, itens: itens.map(item => ({ produto_id: item.produto_id, quantidade: item.quantidade, valor_unitario: item.valor_unitario })) };
      if (editandoId) await orcamentoService.atualizar(editandoId, payload); else await orcamentoService.criar(payload);
      setAlerta({ tipo: 'sucesso', texto: editandoId ? 'Orçamento atualizado com sucesso.' : 'Orçamento salvo com sucesso.' });
      limparFormulario(); await carregarListagem();
    } catch (erro: any) { setAlerta({ tipo: 'erro', texto: erro.response?.data?.mensagem || 'Não foi possível salvar o orçamento.' }); }
    finally { setSalvando(false); }
  };
  const editar = async (orcamento: Orcamento) => {
    try {
      const detalhe = await orcamentoService.obter(orcamento.id);
      setEditandoId(detalhe.id); setClienteId(detalhe.cliente_id || null); setDesconto(Number(detalhe.desconto));
      setItens((detalhe.itens || []).map(item => ({ ...item, quantidade: Number(item.quantidade), valor_unitario: Number(item.valor_unitario), subtotal: Number(item.subtotal) })));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { setAlerta({ tipo: 'erro', texto: 'Não foi possível abrir o orçamento para edição.' }); }
  };
  const cancelar = async () => {
    if (!orcamentoParaCancelar) return;
    try { await orcamentoService.cancelar(orcamentoParaCancelar.id); setAlerta({ tipo: 'sucesso', texto: 'Orçamento cancelado.' }); setOrcamentoParaCancelar(null); await carregarListagem(); }
    catch (erro: any) { setAlerta({ tipo: 'erro', texto: erro.response?.data?.mensagem || 'Não foi possível cancelar o orçamento.' }); }
  };
  const aprovar = async () => {
    if (!orcamentoParaAprovar) return;
    try { const resultado = await orcamentoService.aprovar(orcamentoParaAprovar.id, formaPagamento); setAlerta({ tipo: 'sucesso', texto: `${resultado.mensagem} Venda #${resultado.venda_id}.` }); setOrcamentoParaAprovar(null); await carregarListagem(); }
    catch (erro: any) { setAlerta({ tipo: 'erro', texto: erro.response?.data?.mensagem || 'Não foi possível aprovar o orçamento.' }); }
  };

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><ClipboardList className="text-red-500" /> {editandoId ? `Editando orçamento #${editandoId}` : 'Novo orçamento'}</h1><p className="mt-1 text-xs text-slate-500">Monte uma proposta sem movimentar o estoque.</p></div>{editandoId && <button onClick={limparFormulario} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700">Cancelar edição</button>}</div>
      {alerta && <div className={`mb-4 flex items-center justify-between rounded-xl border p-3 text-sm ${alerta.tipo === 'erro' ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300' : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'}`}><span>{alerta.texto}</span><button onClick={() => setAlerta(null)}><X size={16} /></button></div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]"><label className="text-xs font-bold text-slate-500">Cliente<select value={clienteId || ''} onChange={event => setClienteId(event.target.value ? Number(event.target.value) : null)} className="campo"><option value="">Cliente avulso</option>{clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.nome_fantasia}</option>)}</select></label><div className="relative"><label className="text-xs font-bold text-slate-500">Buscar e adicionar produto</label><div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={buscaProduto} onChange={event => setBuscaProduto(event.target.value)} placeholder="Nome, SKU ou código de barras" className="campo pl-9" /></div>{buscaProduto && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">{produtosFiltrados.map(produto => <button key={produto.id} onClick={() => adicionarProduto(produto)} className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-xs hover:bg-red-50 dark:border-slate-800 dark:hover:bg-red-500/10"><span><b>{produto.nome}</b><small className="ml-2 text-slate-400">{produto.sku || produto.ean || '-'}</small></span><span>{moeda(produto.valor_preco_fixado)}</span></button>)}</div>}</div></div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr><th className="p-3">Produto</th><th className="p-3">Qtd.</th><th className="p-3">Valor unitário</th><th className="p-3">Subtotal</th><th className="p-3" /></tr></thead><tbody>{!itens.length ? <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Pesquise e adicione produtos ao orçamento.</td></tr> : itens.map(item => <tr key={item.produto_id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-semibold">{item.produto_nome}<small className="ml-2 text-slate-400">{item.unidade_comercial}</small></td><td className="p-3"><input aria-label="Quantidade" type="number" min="0.001" step="0.001" value={item.quantidade} onChange={event => alterarItem(item.produto_id, 'quantidade', Number(event.target.value))} className="w-20 rounded-lg border border-slate-200 p-2 dark:border-slate-700 dark:bg-slate-950" /></td><td className="p-3"><input aria-label="Valor unitário" type="number" min="0" step="0.01" value={item.valor_unitario} onChange={event => alterarItem(item.produto_id, 'valor_unitario', Number(event.target.value))} className="w-28 rounded-lg border border-slate-200 p-2 dark:border-slate-700 dark:bg-slate-950" /></td><td className="p-3 font-bold">{moeda(item.quantidade * item.valor_unitario)}</td><td className="p-3"><button onClick={() => setItens(itens.filter(atual => atual.produto_id !== item.produto_id))} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Remover item"><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>
      <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-end md:justify-between dark:bg-slate-950"><label className="w-full text-xs font-bold text-slate-500 md:max-w-48">Desconto (R$)<input type="number" min="0" step="0.01" value={desconto} onChange={event => setDesconto(Math.max(0, Number(event.target.value)))} className="campo" /></label><div className="text-right"><p className="text-xs text-slate-500">Subtotal: {moeda(subtotal)}</p><p className="text-2xl font-extrabold text-red-600">Total: {moeda(total)}</p></div><div className="flex gap-2"><button onClick={limparFormulario} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">Limpar</button><button onClick={salvar} disabled={salvando} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{salvando && <Loader2 size={16} className="animate-spin" />}{editandoId ? 'Atualizar orçamento' : 'Salvar orçamento'}</button></div></div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-xl font-bold">Orçamentos</h2><p className="text-xs text-slate-500">Consulte, altere ou converta propostas em vendas.</p></div><div className="flex flex-wrap gap-2"><input value={busca} onChange={event => setBusca(event.target.value)} onKeyDown={event => event.key === 'Enter' && carregarListagem()} placeholder="Cliente ou código" className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" /><select value={periodo} onChange={event => setPeriodo(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="todos">Todo período</option><option value="hoje">Hoje</option><option value="semana">7 dias</option><option value="mes">30 dias</option></select><select value={statusFiltro} onChange={event => setStatusFiltro(event.target.value as StatusOrcamento | '')} className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="">Todos status</option><option value="pendente">Pendentes</option><option value="aprovado">Aprovados</option><option value="cancelado">Cancelados</option></select><button onClick={carregarListagem} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white">Buscar</button></div></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-y border-slate-200 bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950"><tr><th className="p-3">Cód.</th><th className="p-3">Data</th><th className="p-3">Cliente</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3 text-center">Ações</th></tr></thead><tbody>{carregando ? <TableSkeleton columns={6} /> : !orcamentos.length ? <tr><td colSpan={6}><EmptyState title="Nenhum orçamento encontrado" description="Crie um orçamento para iniciar uma nova proposta." /></td></tr> : orcamentos.map(orcamento => <tr key={orcamento.id} className="border-b border-slate-100 dark:border-slate-800"><td className="p-3 font-mono font-bold text-red-500">#{orcamento.id}</td><td className="p-3">{new Date(orcamento.criado_em).toLocaleString('pt-BR')}</td><td className="p-3 font-semibold">{orcamento.cliente_nome}</td><td className="p-3 font-bold">{moeda(orcamento.total)}</td><td className="p-3"><span className={`rounded-full px-2 py-1 font-bold ${orcamento.status === 'pendente' ? 'bg-amber-100 text-amber-700' : orcamento.status === 'aprovado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{orcamento.status.toUpperCase()}</span></td><td className="p-3"><div className="flex justify-center gap-1">{orcamento.status === 'pendente' && <><button onClick={() => editar(orcamento)} title="Editar" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Edit3 size={15} /></button><button onClick={() => setOrcamentoParaAprovar(orcamento)} title="Aprovar e converter" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><CheckCircle2 size={15} /></button><button onClick={() => setOrcamentoParaCancelar(orcamento)} title="Cancelar" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button></>}{orcamento.venda_id && <span className="px-2 py-2 text-slate-500">Venda #{orcamento.venda_id}</span>}</div></td></tr>)}</tbody></table></div></section>

    {orcamentoParaCancelar && <Modal titulo={`Cancelar orçamento #${orcamentoParaCancelar.id}?`} texto="A proposta será marcada como cancelada e não poderá mais ser alterada." onCancelar={() => setOrcamentoParaCancelar(null)} onConfirmar={cancelar} confirmar="Sim, cancelar" perigo />}
    {orcamentoParaAprovar && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><h3 className="text-lg font-bold">Aprovar orçamento #{orcamentoParaAprovar.id}</h3><p className="mt-1 text-xs text-slate-500">A aprovação cria uma venda e baixa o estoque dos itens.</p><label className="mt-4 block text-xs font-bold text-slate-500">Forma de pagamento<select value={formaPagamento} onChange={event => setFormaPagamento(event.target.value)} className="campo"><option value="PIX">PIX</option><option value="DINHEIRO">Dinheiro</option><option value="CREDITO">Crédito</option><option value="DEBITO">Débito</option><option value="crediario">Crediário</option></select></label><div className="mt-5 flex gap-2"><button onClick={() => setOrcamentoParaAprovar(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold dark:border-slate-700">Voltar</button><button onClick={aprovar} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white">Aprovar</button></div></div></div>}
  </div>;
}

function Modal({ titulo, texto, onCancelar, onConfirmar, confirmar, perigo = false }: { titulo: string; texto: string; onCancelar: () => void; onConfirmar: () => void; confirmar: string; perigo?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><h3 className="text-lg font-bold">{titulo}</h3><p className="mt-2 text-xs leading-relaxed text-slate-500">{texto}</p><div className="mt-5 flex gap-2"><button onClick={onCancelar} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold dark:border-slate-700">Voltar</button><button onClick={onConfirmar} className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white ${perigo ? 'bg-red-600' : 'bg-emerald-600'}`}>{confirmar}</button></div></div></div>;
}
