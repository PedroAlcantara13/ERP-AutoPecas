import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Printer, AlertTriangle, RefreshCw, User, DollarSign, X, Check, Minus, Plus, Volume2, VolumeX } from 'lucide-react';
import { produtoService, type Produto } from '../../services/produto.service';
import { pessoaService, type Pessoa } from '../../services/pessoa.service';
import { vendaService } from '../../services/venda.service';
import { useToast } from '../../contexts/ToastContext';

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}

interface DadosComprovante {
  vendaId: number;
  data: string;
  clienteNome: string;
  itens: { nome: string; quantidade: number; valorUnitario: number; subtotal: number }[];
  subtotal: number;
  desconto: number;
  total: number;
  formaPagamento: string;
  valorRecebido?: number;
  troco?: number;
}

interface QuantityControlProps {
  produto: Produto;
  quantidade: number;
  inputRef: (element: HTMLInputElement | null) => void;
  onChange: (novaQtd: number) => void;
  onRemove: () => void;
}

const FORMAS_PAGAMENTO = [
  { id: 'pix', label: 'PIX' },
  { id: 'dinheiro', label: 'DINHEIRO' },
  { id: 'credito', label: 'CRÉDITO' },
  { id: 'debito', label: 'DÉBITO' },
  { id: 'crediario', label: 'CREDIÁRIO' },
];

const QuantityControl: React.FC<QuantityControlProps> = ({ produto, quantidade, inputRef, onChange, onRemove }) => {
  const passo = produto.unidade_comercial === 'KG' ? 0.1 : 1;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Number((quantidade - passo).toFixed(2)))}
        className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        <Minus size={14} />
      </button>
      <input
        ref={inputRef}
        type="number"
        step={passo}
        min="0"
        value={quantidade}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-12 rounded-lg border border-slate-200 bg-white p-1 text-center text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
      />
      <button
        type="button"
        onClick={() => onChange(Number((quantidade + passo).toFixed(2)))}
        className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        <Plus size={14} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 p-1 text-red-500 hover:text-red-700"
        title="Remover produto"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export const TelaPDVBalcao: React.FC = () => {
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Pessoa[]>([]);
  
  // Estado da Pessoa da Venda
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [dropdownClienteAberto, setDropdownClienteAberto] = useState(false);

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [tipoDesconto, setTipoDesconto] = useState<'valor' | 'percentual'>('valor');
  const [descontoInformado, setDescontoInformado] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState<string>('pix');
  const [valorRecebido, setValorRecebido] = useState<number>(0);
  const [alertaErro, setAlertaErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);
  
  const [comprovante, setComprovante] = useState<DadosComprovante | null>(null);
  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const quantidadeInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [itemSelecionado, setItemSelecionado] = useState<number | null>(null);
  const [itemAnimado, setItemAnimado] = useState<number | null>(null);
  const [somAtivo, setSomAtivo] = useState(() => localStorage.getItem('pdv-som') === 'true');
  const { toast } = useToast();

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setAlertaErro(null);
      const [prods, clis] = await Promise.all([
        produtoService.listar(),
        pessoaService.listar({ cliente: true })
      ]);
      setProdutos(prods);
      setClientes(clis);
    } catch {
      setAlertaErro('Falha ao sincronizar dados com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    const atalhoQuantidade = (event: KeyboardEvent) => {
      const alvo = event.target as HTMLElement | null;
      const digitando = alvo?.tagName === 'INPUT' || alvo?.tagName === 'TEXTAREA' || alvo?.tagName === 'SELECT';
      if (event.altKey && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        quantidadeInputRefs.current[itemSelecionado ?? carrinho[0]?.produto.id]?.focus();
        quantidadeInputRefs.current[itemSelecionado ?? carrinho[0]?.produto.id]?.select();
        return;
      }
      if (digitando || !carrinho.length) return;
      const item = carrinho.find(current => current.produto.id === itemSelecionado) ?? carrinho[0];
      if (!item) return;
      if (event.key === 'ArrowUp' || event.key === 'F2') {
        event.preventDefault();
        atualizarQuantidade(item.produto.id, item.quantidade + (item.produto.unidade_comercial === 'KG' ? 0.1 : 1));
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        atualizarQuantidade(item.produto.id, item.quantidade - (item.produto.unidade_comercial === 'KG' ? 0.1 : 1));
      }
    };
    window.addEventListener('keydown', atalhoQuantidade);
    return () => window.removeEventListener('keydown', atalhoQuantidade);
  }, [carrinho, itemSelecionado]);

  const tocarConfirmacao = () => {
    if (!somAtivo) return;
    try {
      const contexto = new AudioContext();
      const oscilador = contexto.createOscillator();
      const ganho = contexto.createGain();
      oscilador.frequency.value = 880;
      ganho.gain.setValueAtTime(0.025, contexto.currentTime);
      ganho.gain.exponentialRampToValueAtTime(0.001, contexto.currentTime + 0.08);
      oscilador.connect(ganho).connect(contexto.destination);
      oscilador.start(); oscilador.stop(contexto.currentTime + 0.08);
    } catch { /* Navegadores sem Web Audio continuam silenciosamente. */ }
  };

  const alternarSom = () => {
    setSomAtivo(atual => { localStorage.setItem('pdv-som', String(!atual)); return !atual; });
  };

  const clienteSelecionado = useMemo(() => {
    return clientes.find(c => c.id === clienteId) || null;
  }, [clienteId, clientes]);

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientes.slice(0, 5);
    const termo = buscaCliente.toLowerCase();
    return clientes.filter(c =>
      c.nome_fantasia.toLowerCase().includes(termo) ||
      (c.cnpj_cpf && c.cnpj_cpf.toLowerCase().includes(termo)) ||
      (c.whatsapp && c.whatsapp.toLowerCase().includes(termo))
    );
  }, [buscaCliente, clientes]);

  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return [];
    const termo = busca.toLowerCase();
    return produtos.filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      (p.sku && p.sku.toLowerCase().includes(termo)) ||
      (p.ean && p.ean.toLowerCase().includes(termo)) ||
      (p.codigo_nfe && p.codigo_nfe.toLowerCase().includes(termo)) ||
      (p.marca && p.marca.toLowerCase().includes(termo))
    );
  }, [busca, produtos]);

  const adicionarAoCarrinho = (produto: Produto) => {
    setAlertaErro(null);
    const itemExistente = carrinho.find(i => i.produto.id === produto.id);
    const qtdAtual = itemExistente ? itemExistente.quantidade : 0;
    const passo = produto.unidade_comercial === 'KG' ? 0.5 : 1;
    const novaQtd = qtdAtual + passo;

    if (novaQtd > Number(produto.estoque_atual)) {
      setAlertaErro(`Estoque insuficiente! Disponível: ${produto.estoque_atual} ${produto.unidade_comercial}`);
      return;
    }

    if (itemExistente) {
      setCarrinho(carrinho.map(i => i.produto.id === produto.id ? { ...i, quantidade: novaQtd } : i));
    } else {
      setCarrinho([...carrinho, { produto, quantidade: passo }]);
    }
    setItemSelecionado(produto.id);
    setItemAnimado(produto.id);
    window.setTimeout(() => setItemAnimado(null), 750);
    tocarConfirmacao();
    toast(`${produto.nome} adicionado ao carrinho.`);
    setBusca('');
    inputBuscaRef.current?.focus();
  };

  const atualizarQuantidade = (produtoId: number, novaQtd: number) => {
    setAlertaErro(null);
    const item = carrinho.find(i => i.produto.id === produtoId);
    if (!item) return;

    if (novaQtd > Number(item.produto.estoque_atual)) {
      setAlertaErro(`Estoque insuficiente! Máximo: ${item.produto.estoque_atual}`);
      return;
    }

    if (novaQtd <= 0) {
      removerDoCarrinho(produtoId);
      return;
    }

    setCarrinho(carrinho.map(i => i.produto.id === produtoId ? { ...i, quantidade: novaQtd } : i));
  };

  const removerDoCarrinho = (produtoId: number) => {
    setCarrinho(carrinho.filter(i => i.produto.id !== produtoId));
    if (itemSelecionado === produtoId) setItemSelecionado(null);
  };

  const subtotal = carrinho.reduce((acc, item) => acc + (Number(item.produto.valor_preco_fixado) * item.quantidade), 0);
  const desconto = tipoDesconto === 'percentual'
    ? subtotal * Math.min(100, Math.max(0, descontoInformado)) / 100
    : Math.min(subtotal, Math.max(0, descontoInformado));
  const total = Math.max(0, subtotal - desconto);
  const troco = Math.max(0, valorRecebido - total);

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return;

    if (formaPagamento === 'dinheiro' && valorRecebido < total) {
      setAlertaErro(`O valor recebido (R$ ${valorRecebido.toFixed(2)}) é menor que o total da venda (R$ ${total.toFixed(2)}).`);
      return;
    }

    try {
      setCarregando(true);
      setAlertaErro(null);

      const payload = {
        cliente_id: clienteId,
        desconto,
        forma_pagamento: formaPagamento,
        usuario: 'Atendente Balcão',
        valor_recebido: formaPagamento === 'dinheiro' ? valorRecebido : undefined,
        troco: formaPagamento === 'dinheiro' ? troco : undefined,
        itens: carrinho.map(item => ({
          produto_id: item.produto.id,
          quantidade: item.quantidade
        }))
      };

      const res = await vendaService.finalizar(payload);

      const formaRotulo = FORMAS_PAGAMENTO.find(f => f.id === formaPagamento)?.label || formaPagamento.toUpperCase();

      setComprovante({
        vendaId: res.venda_id,
        data: new Date(res.data).toLocaleString('pt-BR'),
        clienteNome: clienteSelecionado ? clienteSelecionado.nome_fantasia : 'Cliente Avulso (Balcão)',
        itens: carrinho.map(item => ({
          nome: item.produto.nome,
          quantidade: item.quantidade,
          valorUnitario: Number(item.produto.valor_preco_fixado),
          subtotal: Number(item.produto.valor_preco_fixado) * item.quantidade
        })),
        subtotal,
        desconto,
        total: res.total,
        formaPagamento: formaRotulo,
        valorRecebido: formaPagamento === 'dinheiro' ? valorRecebido : undefined,
        troco: formaPagamento === 'dinheiro' ? troco : undefined
      });

      setCarrinho([]);
      setDescontoInformado(0);
      setTipoDesconto('valor');
      setValorRecebido(0);
      setClienteId(null);
      setBuscaCliente('');
      await carregarDados();

    } catch (err: any) {
      const msg = err.response?.data?.mensagem || 'Erro ao processar venda no servidor.';
      setAlertaErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  const imprimirCupom = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cupom-impressao, #cupom-impressao * { visibility: visible; }
          #cupom-impressao {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 5mm;
            font-family: monospace;
            font-size: 11px;
            color: #000;
            background: #fff;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Cabeçalho */}
      <header className="flex justify-between items-center mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600"></span>
            PDV Balcão - AutoPeças
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Operação ágil e rápida de atendimento</p>
        </div>
        <div className="flex gap-2">
          <button onClick={carregarDados} className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-red-300 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} />
          </button>
          <button onClick={alternarSom} className={`rounded-2xl border p-2.5 shadow-sm transition ${somAtivo ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'}`} title={somAtivo ? 'Desativar som de confirmação' : 'Ativar som de confirmação'}>
            {somAtivo ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </header>

      {/* Alerta de erro */}
      {alertaErro && (
        <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">{alertaErro}</span>
          </div>
          <button onClick={() => setAlertaErro(null)} className="text-xs underline font-bold">Fechar</button>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Painel Esquerdo: Busca e Produtos */}
        <section className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-black/10">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pesquisa Rápida de Produtos
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                ref={inputBuscaRef}
                type="text"
                placeholder="Digite Nome, SKU, Aplicação ou Código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                autoFocus
              />
            </div>

            {produtosFiltrados.length > 0 && (
              <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                {produtosFiltrados.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => adicionarAoCarrinho(prod)}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5 transition hover:border-red-500/50 hover:bg-red-50 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-red-500/5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{prod.nome}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                          {prod.sku}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Aplicação: {prod.marca || 'Geral'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-red-500">
                        R$ {Number(prod.valor_preco_fixado).toFixed(2)}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Estoque: {prod.estoque_atual} {prod.unidade_comercial}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Painel Direito: Carrinho e Checkout */}
        <section className="lg:col-span-5">
          <div className="flex h-full flex-col justify-between space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-black/10">
            <div>
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShoppingCart size={20} className="text-red-500" /> Itens no Carrinho
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">{carrinho.length} itens</span>
              </div>

              {/* Busca de Pessoa */}
              <div className="mb-3 relative">
                <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <User size={14} /> Pessoa da Venda
                </label>

                {clienteSelecionado ? (
                  <div className="flex items-center justify-between rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 text-slate-900 dark:text-slate-100">
                    <div>
                      <p className="text-xs font-bold">{clienteSelecionado.nome_fantasia}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {clienteSelecionado.cnpj_cpf ? `CPF/CNPJ: ${clienteSelecionado.cnpj_cpf}` : 'Sem documento'}
                        {clienteSelecionado.whatsapp ? ` | Tel: ${clienteSelecionado.whatsapp}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setClienteId(null); setBuscaCliente(''); }}
                      className="p-1 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                      title="Remover cliente"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquisar por Nome, CPF/CNPJ ou Tel..."
                      value={buscaCliente}
                      onChange={(e) => {
                        setBuscaCliente(e.target.value);
                        setDropdownClienteAberto(true);
                      }}
                      onFocus={() => setDropdownClienteAberto(true)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 pr-8 text-xs text-slate-900 outline-none transition focus:border-red-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    {buscaCliente && (
                      <button
                        type="button"
                        onClick={() => { setBuscaCliente(''); setDropdownClienteAberto(false); }}
                        className="absolute right-2 top-2.5 text-slate-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    )}

                    {dropdownClienteAberto && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        <div
                          onClick={() => {
                            setClienteId(null);
                            setBuscaCliente('');
                            setDropdownClienteAberto(false);
                          }}
                          className="flex cursor-pointer items-center justify-between border-b border-slate-100 p-2 text-xs hover:bg-red-500/10 dark:border-slate-800"
                        >
                          <span className="font-semibold text-slate-500 dark:text-slate-400">Pessoa Avulso (Balcão)</span>
                          {!clienteId && <Check size={14} className="text-red-500" />}
                        </div>

                        {clientesFiltrados.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500">Nenhum cliente encontrado</div>
                        ) : (
                          clientesFiltrados.map((cli) => (
                            <div
                              key={cli.id}
                              onClick={() => {
                                setClienteId(cli.id || null);
                                setBuscaCliente('');
                                setDropdownClienteAberto(false);
                              }}
                              className="flex cursor-pointer items-center justify-between border-b border-slate-100 p-2.5 text-xs transition hover:bg-red-500/10 dark:border-slate-800/40"
                            >
                              <div>
                                <p className="font-bold">{cli.nome_fantasia}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {cli.cnpj_cpf || 'Sem CPF'} {cli.whatsapp ? `• ${cli.whatsapp}` : ''}
                                </p>
                              </div>
                              {clienteId === cli.id && <Check size={14} className="text-red-500" />}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lista do Carrinho */}
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {carrinho.length === 0 ? (
                  <div className="py-8 text-center"><ShoppingCart size={26} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" /><p className="text-xs text-slate-500">Busque um produto ou use os atalhos abaixo.</p></div>
                ) : (
                  carrinho.map(({ produto, quantidade }) => (
                    <div key={produto.id} onClick={() => setItemSelecionado(produto.id)} className={`flex cursor-pointer items-center justify-between rounded-2xl border p-2.5 transition ${itemSelecionado === produto.id ? 'border-red-400 bg-red-50 dark:bg-red-500/10' : 'border-slate-200 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-950/30'} ${itemAnimado === produto.id ? 'animate-cart-pulse' : ''}`}>
                      <div className="flex-1 pr-2">
                        <p className="text-xs font-medium line-clamp-1">{produto.nome}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">R$ {Number(produto.valor_preco_fixado).toFixed(2)} / {produto.unidade_comercial}</p>
                      </div>
                      <QuantityControl
                        produto={produto}
                        quantidade={quantidade}
                        inputRef={element => { quantidadeInputRefs.current[produto.id] = element; }}
                        onChange={novaQuantidade => atualizarQuantidade(produto.id, novaQuantidade)}
                        onRemove={() => removerDoCarrinho(produto.id)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totalizadores e Pagamento */}
            <div className="space-y-2.5 border-t border-slate-200 pt-3 dark:border-slate-800">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Desconto</span>
                  <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                    <button type="button" onClick={() => setTipoDesconto('valor')} className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${tipoDesconto === 'valor' ? 'bg-red-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>R$</button>
                    <button type="button" onClick={() => setTipoDesconto('percentual')} className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${tipoDesconto === 'percentual' ? 'bg-red-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>%</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={tipoDesconto === 'percentual' ? 100 : subtotal}
                    step={tipoDesconto === 'percentual' ? '0.01' : '0.01'}
                    value={descontoInformado || ''}
                    onChange={(e) => {
                      const valor = Math.max(0, parseFloat(e.target.value) || 0);
                      setDescontoInformado(tipoDesconto === 'percentual' ? Math.min(100, valor) : valor);
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-right text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    placeholder={tipoDesconto === 'percentual' ? '0,00' : '0,00'}
                    aria-label={tipoDesconto === 'percentual' ? 'Desconto em porcentagem' : 'Desconto em reais'}
                  />
                  <span className="w-12 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400">{tipoDesconto === 'percentual' ? '%' : 'R$'}</span>
                </div>
                {desconto > 0 && <p className="mt-1.5 text-right text-[10px] font-medium text-emerald-600 dark:text-emerald-400">− R$ {desconto.toFixed(2)} {tipoDesconto === 'percentual' && `(${Math.min(100, descontoInformado).toFixed(2)}%)`}</p>}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-slate-800/60">
                <span>Total</span>
                <span className="text-xl text-red-500">R$ {total.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {FORMAS_PAGAMENTO.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormaPagamento(item.id)}
                    className={`rounded-xl border py-2 text-[10px] font-bold transition ${
                      formaPagamento === item.id
                        ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {formaPagamento === 'dinheiro' && (
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><DollarSign size={14} /> Valor Recebido:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={valorRecebido || ''}
                      onChange={(e) => setValorRecebido(parseFloat(e.target.value) || 0)}
                      className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-1 text-right text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 text-xs font-bold dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Troco:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">R$ {troco.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={finalizarVenda}
                disabled={carrinho.length === 0 || carregando}
                className="w-full mt-2 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-red-600/20 transition flex justify-center items-center gap-2"
              >
                <Printer size={18} />
                {carregando ? 'Processando...' : 'Finalizar & Gerar Cupom'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Modal do Cupom */}
      {comprovante && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 p-6 rounded-3xl max-w-sm w-full shadow-2xl relative space-y-4">
            <button type="button" onClick={() => setComprovante(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 no-print">
              <X size={20} />
            </button>

            <div id="cupom-impressao" className="space-y-3 font-mono text-xs">
              <div className="text-center border-b border-dashed border-gray-400 pb-2">
                <h3 className="font-bold text-sm uppercase">AUTOPEÇAS & OFICINA</h3>
                <p>Comprovante Não Fiscal</p>
                <p className="text-[10px] text-gray-500">{comprovante.data}</p>
                <p className="font-bold">Venda Nº #{comprovante.vendaId}</p>
              </div>

              <div>
                <p><span className="font-bold">Pessoa:</span> {comprovante.clienteNome}</p>
              </div>

              <div className="border-b border-t border-dashed border-gray-400 py-2 space-y-1">
                <div className="flex justify-between font-bold text-[10px]">
                  <span>ITEM</span>
                  <span>QTD x UNIT</span>
                  <span>TOTAL</span>
                </div>
                {comprovante.itens.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[120px]">{item.nome}</span>
                    <span>{item.quantidade}x R${item.valorUnitario.toFixed(2)}</span>
                    <span className="font-bold">R${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right">
                <p>Subtotal: R$ {comprovante.subtotal.toFixed(2)}</p>
                {comprovante.desconto > 0 && <p>Desconto: -R$ {comprovante.desconto.toFixed(2)}</p>}
                <p className="font-bold text-sm">TOTAL: R$ {comprovante.total.toFixed(2)}</p>
                <p className="text-[10px]">Pagamento: {comprovante.formaPagamento}</p>
                {comprovante.valorRecebido !== undefined && (
                  <>
                    <p className="text-[10px]">Valor Pago: R$ {comprovante.valorRecebido.toFixed(2)}</p>
                    <p className="text-[10px] font-bold">Troco: R$ {comprovante.troco?.toFixed(2)}</p>
                  </>
                )}
              </div>

              <div className="text-center border-t border-dashed border-gray-400 pt-2 text-[10px]">
                <p>Obrigado pela preferência!</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 no-print">
              <button
                type="button"
                onClick={imprimirCupom}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-sm"
              >
                <Printer size={18} /> Imprimir Cupom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};