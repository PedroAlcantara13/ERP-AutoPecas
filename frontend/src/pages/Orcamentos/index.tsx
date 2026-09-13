import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Filter,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { pessoaService, type Pessoa } from '../../services/pessoa.service';
import { produtoService, type Produto } from '../../services/produto.service';
import {
  orcamentoService,
  type Orcamento,
  type OrcamentoItem,
  type StatusOrcamento,
} from '../../services/orcamento.service';
import { EmptyState, TableSkeleton } from '../../components/Feedback';

type ItemFormulario = OrcamentoItem;

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));

const formatarData = (dataIso: string) => {
  if (!dataIso) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dataIso));
};

export function TelaOrcamentos() {
  const [clientes, setClientes] = useState<Pessoa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  
  // Estado do formulário
  const [itens, setItens] = useState<ItemFormulario[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteNome, setClienteNome] = useState<string>('Cliente Avulso');
  const [desconto, setDesconto] = useState<number>(0);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [buscaProduto, setBuscaProduto] = useState('');

  // Filtros e listagem
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState<StatusOrcamento | ''>('');

  // Estados visuais
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);

  // Modais
  const [orcamentoParaCancelar, setOrcamentoParaCancelar] = useState<Orcamento | null>(null);
  const [orcamentoParaAprovar, setOrcamentoParaAprovar] = useState<Orcamento | null>(null);
  const [formaPagamento, setFormaPagamento] = useState('PIX');

  const carregarListagem = async () => {
    try {
      setCarregando(true);
      const lista = await orcamentoService.listar({
        busca,
        periodo,
        status: statusFiltro || undefined,
      });
      setOrcamentos(lista);
    } catch {
      setAlerta({ tipo: 'erro', texto: 'Não foi possível carregar a lista de orçamentos.' });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarListagem();
  }, [periodo, statusFiltro]);

  useEffect(() => {
    Promise.all([pessoaService.listar({ cliente: true }), produtoService.listar()])
      .then(([listaClientes, listaProdutos]) => {
        setClientes(listaClientes);
        setProdutos(listaProdutos);
      })
      .catch(() => setAlerta({ tipo: 'erro', texto: 'Falha ao carregar dados de clientes e produtos.' }));
  }, []);

  // Métricas rápidas
  const metricas = useMemo(() => {
    const pendentes = orcamentos.filter((o) => o.status === 'pendente');
    const aprovados = orcamentos.filter((o) => o.status === 'aprovado');
    const totalPendentes = pendentes.reduce((acc, o) => acc + Number(o.total), 0);
    return {
      totalPendentes,
      qtdPendentes: pendentes.length,
      qtdAprovados: aprovados.length,
    };
  }, [orcamentos]);

  const subtotal = useMemo(
    () => itens.reduce((total, item) => total + Number(item.quantidade) * Number(item.valor_unitario), 0),
    [itens]
  );
  const total = Math.max(0, subtotal - desconto);

  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.trim().toLowerCase();
    if (!termo) return [];
    return produtos
      .filter(
        (p) =>
          p.nome.toLowerCase().includes(termo) ||
          (p.sku && p.sku.toLowerCase().includes(termo)) ||
          (p.ean && p.ean.toLowerCase().includes(termo))
      )
      .slice(0, 7);
  }, [buscaProduto, produtos]);

  const selecionarCliente = (idStr: string) => {
    if (!idStr) {
      setClienteId(null);
      setClienteNome('Cliente Avulso');
      return;
    }
    const id = Number(idStr);
    const clienteEncontrado = clientes.find((c) => c.id === id);
    setClienteId(id);
    setClienteNome(clienteEncontrado?.nome_fantasia || 'Cliente Avulso');
  };

  const adicionarProduto = (produto: Produto) => {
    const existente = itens.find((item) => item.produto_id === produto.id);
    if (existente) {
      setItens(
        itens.map((item) =>
          item.produto_id === produto.id ? { ...item, quantidade: Number(item.quantidade) + 1 } : item
        )
      );
    } else {
      setItens([
        ...itens,
        {
          produto_id: produto.id,
          produto_nome: produto.nome,
          sku: produto.sku,
          unidade_comercial: produto.unidade_comercial,
          estoque_atual: produto.estoque_atual,
          quantidade: 1,
          valor_unitario: Number(produto.valor_preco_fixado),
          subtotal: Number(produto.valor_preco_fixado),
        },
      ]);
    }
    setBuscaProduto('');
  };

  const alterarItem = (produtoId: number, campo: 'quantidade' | 'valor_unitario', valor: number) => {
    setItens(
      itens.map((item) => (item.produto_id === produtoId ? { ...item, [campo]: Math.max(0, valor) } : item))
    );
  };

  const limparFormulario = () => {
    setItens([]);
    setClienteId(null);
    setClienteNome('Cliente Avulso');
    setDesconto(0);
    setEditandoId(null);
    setBuscaProduto('');
  };

  const salvar = async () => {
    if (!itens.length) {
      setAlerta({ tipo: 'erro', texto: 'Adicione ao menos um produto ao orçamento.' });
      return;
    }
    try {
      setSalvando(true);
      const payload = {
        cliente_id: clienteId,
        cliente_nome: clienteNome,
        desconto,
        itens: itens.map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
        })),
      };

      if (editandoId) {
        await orcamentoService.atualizar(editandoId, payload);
      } else {
        await orcamentoService.criar(payload);
      }

      setAlerta({
        tipo: 'sucesso',
        texto: editandoId ? `Orçamento #${editandoId} atualizado!` : 'Orçamento criado com sucesso.',
      });
      limparFormulario();
      await carregarListagem();
    } catch (erro: any) {
      setAlerta({
        tipo: 'erro',
        texto: erro.response?.data?.mensagem || 'Não foi possível salvar o orçamento.',
      });
    } finally {
      setSalvando(false);
    }
  };

  const editar = async (orcamento: Orcamento) => {
    try {
      const detalhe = await orcamentoService.obter(orcamento.id);
      setEditandoId(detalhe.id);
      setClienteId(detalhe.cliente_id || null);
      setClienteNome(detalhe.cliente_nome || 'Cliente Avulso');
      setDesconto(Number(detalhe.desconto));
      setItens(
        (detalhe.itens || []).map((item) => ({
          ...item,
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor_unitario),
          subtotal: Number(item.subtotal),
        }))
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setAlerta({ tipo: 'erro', texto: 'Falha ao carregar detalhes do orçamento para edição.' });
    }
  };

  const cancelar = async () => {
    if (!orcamentoParaCancelar) return;
    try {
      await orcamentoService.cancelar(orcamentoParaCancelar.id);
      setAlerta({ tipo: 'sucesso', texto: `Orçamento #${orcamentoParaCancelar.id} cancelado.` });
      setOrcamentoParaCancelar(null);
      await carregarListagem();
    } catch (erro: any) {
      setAlerta({
        tipo: 'erro',
        texto: erro.response?.data?.mensagem || 'Não foi possível cancelar o orçamento.',
      });
    }
  };

  const aprovar = async () => {
    if (!orcamentoParaAprovar) return;
    try {
      const resultado = await orcamentoService.aprovar(orcamentoParaAprovar.id, formaPagamento);
      setAlerta({
        tipo: 'sucesso',
        texto: `Orçamento #${orcamentoParaAprovar.id} aprovado! Venda #${resultado.venda_id} gerada.`,
      });
      setOrcamentoParaAprovar(null);
      await carregarListagem();
    } catch (erro: any) {
      setAlerta({
        tipo: 'erro',
        texto: erro.response?.data?.mensagem || 'Falha ao aprovar e converter orçamento.',
      });
    }
  };

  return (
    <div className="page-shell space-y-8 text-slate-900 dark:text-slate-100">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <FileText size={22} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Gestão de Orçamentos</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 md:text-sm dark:text-slate-400">
            Crie cotações personalizadas para seus clientes antes da emissão de vendas.
          </p>
        </div>

        {/* Cards de Métricas Rápidas */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Em Aberto</p>
              <p className="text-sm font-bold">{formatarMoeda(metricas.totalPendentes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Convertidos</p>
              <p className="text-sm font-bold">{metricas.qtdAprovados} orçamentos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Global */}
      {alerta && (
        <div
          className={`flex items-center justify-between rounded-2xl border p-4 text-sm shadow-sm animate-in fade-in duration-200 ${
            alerta.tipo === 'erro'
              ? 'border-red-200 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {alerta.tipo === 'erro' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span className="font-medium">{alerta.texto}</span>
          </div>
          <button
            onClick={() => setAlerta(null)}
            className="rounded-lg p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* CARD DE FORMULÁRIO (NOVO / EDITAR) */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">
              {editandoId ? `Editando Orçamento #${editandoId}` : 'Novo Orçamento'}
            </h2>
            {editandoId && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                Edição ativa
              </span>
            )}
          </div>
          {editandoId && (
            <button
              onClick={limparFormulario}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar edição
            </button>
          )}
        </div>

        {/* Campos Principais: Cliente e Produto */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Cliente */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <User size={14} /> Cliente Destinatário
            </label>
            <select
              value={clienteId || ''}
              onChange={(e) => selecionarCliente(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium transition focus:border-red-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950"
            >
              <option value="">Cliente Avulso (Consumidor Final)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_fantasia} {c.cnpj_cpf ? `(${c.cnpj_cpf})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Autocomplete de Produtos */}
          <div className="relative space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Package size={14} /> Buscar Produtos
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Digite o nome, SKU ou Código de barras..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm font-medium transition focus:border-red-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950"
              />
            </div>

            {/* Dropdown de Busca */}
            {buscaProduto && (
              <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {produtosFiltrados.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">Nenhum produto encontrado.</div>
                ) : (
                  produtosFiltrados.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => adicionarProduto(prod)}
                      className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left transition hover:bg-red-50/60 dark:border-slate-800 dark:hover:bg-red-950/30"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{prod.nome}</p>
                        <p className="text-[11px] text-slate-400">
                          SKU: {prod.sku || '-'} | Est: {Number(prod.estoque_atual).toFixed(0)}{' '}
                          {prod.unidade_comercial}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-red-600 dark:text-red-400">
                          {formatarMoeda(prod.valor_preco_fixado)}
                        </span>
                        <span className="block text-[10px] font-bold text-slate-400">+ Adicionar</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Itens Selecionados */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3.5 pl-4">Produto</th>
                <th className="p-3.5 w-28">Qtd</th>
                <th className="p-3.5 w-36">Valor Unitário</th>
                <th className="p-3.5 w-32">Subtotal</th>
                <th className="p-3.5 w-12 text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                    Nenhum item adicionado ao orçamento. Utilize a busca acima para adicionar.
                  </td>
                </tr>
              ) : (
                itens.map((item) => (
                  <tr key={item.produto_id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3.5 pl-4">
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {item.produto_nome}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        Unidade: {item.unidade_comercial || 'UN'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <input
                        type="number"
                        min="0.001"
                        step="1"
                        value={item.quantidade}
                        onChange={(e) => alterarItem(item.produto_id, 'quantidade', Number(e.target.value))}
                        className="w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                      />
                    </td>
                    <td className="p-3.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valor_unitario}
                        onChange={(e) => alterarItem(item.produto_id, 'valor_unitario', Number(e.target.value))}
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                      />
                    </td>
                    <td className="p-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {formatarMoeda(item.quantidade * item.valor_unitario)}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setItens(itens.filter((i) => i.produto_id !== item.produto_id))}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        title="Remover produto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé do Formulário com Totais */}
        <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-50/80 p-4 md:flex-row md:items-center md:justify-between dark:bg-slate-950/60">
          <div className="w-full max-w-xs space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Desconto (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={desconto}
              onChange={(e) => setDesconto(Math.max(0, Number(e.target.value)))}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold transition focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-slate-400">Subtotal: {formatarMoeda(subtotal)}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold uppercase text-slate-500">Total:</span>
              <span className="text-2xl font-extrabold text-red-600 dark:text-red-500">
                {formatarMoeda(total)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 md:pt-0">
            <button
              onClick={limparFormulario}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Limpar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
            >
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {editandoId ? 'Atualizar Orçamento' : 'Salvar Orçamento'}
            </button>
          </div>
        </div>
      </section>

      {/* HISTÓRICO E CONSULTA DE ORÇAMENTOS */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold">Orçamentos Cadastrados</h3>
            <p className="text-xs text-slate-400">Gerencie e converta orçamentos existentes em vendas.</p>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && carregarListagem()}
                placeholder="Buscar por cliente ou ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs font-medium transition focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-1 dark:border-slate-700 dark:bg-slate-950">
              <Calendar size={14} className="text-slate-400 ml-1" />
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="bg-transparent py-1 text-xs font-medium focus:outline-none dark:text-slate-200"
              >
                <option value="todos">Todo o Período</option>
                <option value="hoje">Hoje</option>
                <option value="semana">Últimos 7 dias</option>
                <option value="mes">Últimos 30 dias</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-1 dark:border-slate-700 dark:bg-slate-950">
              <Filter size={14} className="text-slate-400 ml-1" />
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value as StatusOrcamento | '')}
                className="bg-transparent py-1 text-xs font-medium focus:outline-none dark:text-slate-200"
              >
                <option value="">Todos Status</option>
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <button
              onClick={carregarListagem}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>
        </div>

        {/* Tabela de Orçamentos */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3.5 pl-4">Código</th>
                <th className="p-3.5">Data de Criação</th>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Valor Total</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {carregando ? (
                <TableSkeleton columns={6} />
              ) : orcamentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState
                      title="Nenhum orçamento encontrado"
                      description="Ajuste os filtros ou crie uma nova proposta acima."
                    />
                  </td>
                </tr>
              ) : (
                orcamentos.map((orcamento) => (
                  <tr
                    key={orcamento.id}
                    className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="p-3.5 pl-4 font-mono font-bold text-red-600 dark:text-red-400">
                      #{orcamento.id}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {formatarData(orcamento.criado_em)}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      {orcamento.cliente_nome || 'Cliente Avulso'}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                      {formatarMoeda(orcamento.total)}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          orcamento.status === 'pendente'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : orcamento.status === 'aprovado'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            orcamento.status === 'pendente'
                              ? 'bg-amber-500'
                              : orcamento.status === 'aprovado'
                              ? 'bg-emerald-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        {orcamento.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1">
                        {orcamento.status === 'pendente' ? (
                          <>
                            <button
                              onClick={() => editar(orcamento)}
                              title="Editar orçamento"
                              className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => setOrcamentoParaAprovar(orcamento)}
                              title="Aprovar e converter em Venda"
                              className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              onClick={() => setOrcamentoParaCancelar(orcamento)}
                              title="Cancelar orçamento"
                              className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">
                            {orcamento.venda_id ? `Venda #${orcamento.venda_id}` : 'Finalizado'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL DE CANCELAMENTO */}
      {orcamentoParaCancelar && (
        <ModalConfirmacao
          titulo={`Cancelar Orçamento #${orcamentoParaCancelar.id}?`}
          texto="A proposta será marcada como cancelada. Esta ação não afetará seu estoque nem seu caixa."
          onCancelar={() => setOrcamentoParaCancelar(null)}
          onConfirmar={cancelar}
          textoConfirmar="Sim, Cancelar"
          variante="perigo"
        />
      )}

      {/* MODAL DE APROVAÇÃO */}
      {orcamentoParaAprovar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <ShoppingBag size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold">Aprovar Orçamento #{orcamentoParaAprovar.id}</h3>
                <p className="text-xs text-slate-400">Converter orçamento em venda registrada.</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-950">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Cliente:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {orcamentoParaAprovar.cliente_nome || 'Cliente Avulso'}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>Valor Total:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {formatarMoeda(orcamentoParaAprovar.total)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Forma de Pagamento
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold transition focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="PIX">PIX</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CREDITO">Cartão de Crédito</option>
                  <option value="DEBITO">Cartão de Débito</option>
                  <option value="crediario">Crediário (A Prazo)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => setOrcamentoParaAprovar(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Voltar
              </button>
              <button
                onClick={aprovar}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700"
              >
                Aprovar & Gerar Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalConfirmacao({
  titulo,
  texto,
  onCancelar,
  onConfirmar,
  textoConfirmar,
  variante = 'padrao',
}: {
  titulo: string;
  texto: string;
  onCancelar: () => void;
  onConfirmar: () => void;
  textoConfirmar: string;
  variante?: 'padrao' | 'perigo';
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{titulo}</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{texto}</p>
        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={onCancelar}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Voltar
          </button>
          <button
            onClick={onConfirmar}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition ${
              variante === 'perigo'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
