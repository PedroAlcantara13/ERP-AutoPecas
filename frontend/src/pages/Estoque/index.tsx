// src/pages/Estoque/index.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Search,
  AlertTriangle,
  PlusCircle,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle2,
  X,
  TrendingDown,
  Layers,
  ListPlus,
  Plus,
  Minus,
  Trash
} from 'lucide-react';
import { produtoService, type Produto } from '../../services/produto.service';
import { EmptyState, TableSkeleton } from '../../components/Feedback';

interface ItemLote {
  produto: Produto;
  quantidade: number;
}

export const TelaGestaoEstoque: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtrarBaixoEstoque, setFiltrarBaixoEstoque] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: 'erro' | 'sucesso'; msg: string } | null>(null);

  // Modal: Entrada de 1 em 1
  const [produtoMovimentar, setProdutoMovimentar] = useState<Produto | null>(null);
  const [qtdEntrada, setQtdEntrada] = useState<number>(1);

  // Modal: Entrada em Lote (Diversos itens)
  const [modalLoteAberto, setModalLoteAberto] = useState(false);
  const [itensLote, setItensLote] = useState<ItemLote[]>([]);
  const [buscaLote, setBuscaLote] = useState('');

  // Modal: Editar
  const [produtoEditar, setProdutoEditar] = useState<Produto | null>(null);
  const [formEdicao, setFormEdicao] = useState<Partial<Produto>>({});

  // Modal: Inativar
  const [produtoInativar, setProdutoInativar] = useState<Produto | null>(null);

  const carregarProdutos = useCallback(async () => {
    try {
      setCarregando(true);
      setAlerta(null);
      const res = await produtoService.listar({
        busca,
        somenteBaixoEstoque: filtrarBaixoEstoque
      });
      setProdutos(res);
    } catch {
      setAlerta({ tipo: 'erro', msg: 'Falha ao carregar a lista de estoque.' });
    } finally {
      setCarregando(false);
    }
  }, [busca, filtrarBaixoEstoque]);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  // Métricas do Topo
  const estatisticas = useMemo(() => {
    const totalItens = produtos.reduce((acc, p) => acc + Number(p.estoque_atual), 0);
    const abaixoMinimo = produtos.filter(p => Number(p.estoque_atual) <= Number(p.estoque_minimo)).length;
    const semEstoque = produtos.filter(p => Number(p.estoque_atual) <= 0).length;

    return { totalProdutos: produtos.length, totalItens, abaixoMinimo, semEstoque };
  }, [produtos]);

  // Produtos filtrados dentro do modal de entrada em lote
  const produtosFiltradosLote = useMemo(() => {
    if (!buscaLote.trim()) return produtos.slice(0, 8);
    const termo = buscaLote.toLowerCase();
    return produtos.filter(
      p =>
        p.nome.toLowerCase().includes(termo) ||
        (p.sku && p.sku.toLowerCase().includes(termo)) ||
        (p.marca && p.marca.toLowerCase().includes(termo))
    );
  }, [produtos, buscaLote]);

  // Ação: Adicionar item à lista de lote
  const adicionarAoLote = (prod: Produto) => {
    setItensLote(prev => {
      const existe = prev.find(item => item.produto.id === prod.id);
      if (existe) {
        return prev.map(item =>
          item.produto.id === prod.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { produto: prod, quantidade: 1 }];
    });
  };

  // Ação: Remover item do lote
  const removerDoLote = (produtoId: number) => {
    setItensLote(prev => prev.filter(item => item.produto.id !== produtoId));
  };

  // Ação: Atualizar quantidade no lote
  const atualizarQtdLote = (produtoId: number, qtd: number) => {
    const quantidadeInteira = Math.max(1, Math.trunc(qtd));
    setItensLote(prev =>
      prev.map(item =>
        item.produto.id === produtoId ? { ...item, quantidade: quantidadeInteira } : item
      )
    );
  };

  // Ação: Processar Entrada em Lote
  const processarEntradaLote = async () => {
    if (itensLote.length === 0) return;
    try {
      setCarregando(true);
      await Promise.all(
        itensLote.map(item => produtoService.adicionarEstoque(item.produto.id, item.quantidade))
      );
      setAlerta({
        tipo: 'sucesso',
        msg: `Entrada em lote concluída! ${itensLote.length} produto(s) atualizado(s).`
      });
      setModalLoteAberto(false);
      setItensLote([]);
      setBuscaLote('');
      await carregarProdutos();
    } catch (err: any) {
      const msg = err.response?.data?.mensagem || 'Erro ao processar entrada em lote no estoque.';
      setAlerta({ tipo: 'erro', msg });
    } finally {
      setCarregando(false);
    }
  };

  // Ação: Confirmar Entrada Individual de Estoque
  const processarEntradaEstoque = async () => {
    if (!produtoMovimentar || qtdEntrada <= 0) return;
    try {
      setCarregando(true);
      await produtoService.adicionarEstoque(produtoMovimentar.id, qtdEntrada);
      setAlerta({ tipo: 'sucesso', msg: `Entrada de ${qtdEntrada} ${produtoMovimentar.unidade_comercial} realizada com sucesso!` });
      setProdutoMovimentar(null);
      setQtdEntrada(1);
      await carregarProdutos();
    } catch (err: any) {
      const msg = err.response?.data?.mensagem || 'Erro ao registrar entrada no estoque.';
      setAlerta({ tipo: 'erro', msg });
    } finally {
      setCarregando(false);
    }
  };

  // Ação: Salvar Edição
  const processarEdicao = async () => {
    if (!produtoEditar) return;
    try {
      setCarregando(true);
      await produtoService.atualizar(produtoEditar.id, formEdicao);
      setAlerta({ tipo: 'sucesso', msg: 'Produto atualizado com sucesso!' });
      setProdutoEditar(null);
      await carregarProdutos();
    } catch (err: any) {
      const msg = err.response?.data?.mensagem || 'Erro ao atualizar produto.';
      setAlerta({ tipo: 'erro', msg });
    } finally {
      setCarregando(false);
    }
  };

  // Ação: Confirmar Inativação
  const processarInativacao = async () => {
    if (!produtoInativar) return;
    try {
      setCarregando(true);
      await produtoService.inativar(produtoInativar.id);
      setAlerta({ tipo: 'sucesso', msg: 'Produto removido do estoque.' });
      setProdutoInativar(null);
      await carregarProdutos();
    } catch (err: any) {
      const msg = err.response?.data?.mensagem || 'Erro ao inativar produto.';
      setAlerta({ tipo: 'erro', msg });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="page-shell">
      {/* Cabeçalho */}
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="text-red-500" size={24} /> Gestão Avançada de Estoque
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Entradas manuais e em lote, alertas de estoque mínimo e edição</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalLoteAberto(true)}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <ListPlus size={18} /> Entrada em Lote (Múltiplos)
          </button>

          <button
            onClick={carregarProdutos}
            className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Alertas globais */}
      {alerta && (
        <div className={`mb-4 p-4 rounded-2xl border flex items-center justify-between ${alerta.tipo === 'erro' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          <div className="flex items-center gap-3">
            {alerta.tipo === 'erro' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            <span className="text-sm font-medium">{alerta.msg}</span>
          </div>
          <button onClick={() => setAlerta(null)} className="text-xs underline font-bold">Fechar</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400"><Layers size={20} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Total de Cadastros</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{estatisticas.totalProdutos} produtos</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400"><TrendingDown size={20} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Abaixo do Mínimo</p>
            <p className="text-lg font-bold text-amber-400">{estatisticas.abaixoMinimo} itens</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400"><AlertTriangle size={20} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Sem Estoque (Zera)</p>
            <p className="text-lg font-bold text-red-400">{estatisticas.semEstoque} itens</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400"><Package size={20} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Total Físico (Qtd)</p>
            <p className="text-lg font-bold text-emerald-400">{estatisticas.totalItens} un</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-md md:flex-row md:items-center dark:border-slate-800 dark:bg-slate-900/60">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 text-slate-500 dark:text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Filtrar por Nome, SKU ou Aplicação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-900 outline-none transition focus:border-red-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <button
          onClick={() => setFiltrarBaixoEstoque(!filtrarBaixoEstoque)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${filtrarBaixoEstoque ? 'border border-amber-500/40 bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
        >
          <AlertTriangle size={14} />
          {filtrarBaixoEstoque ? 'Exibindo: Críticos / Abaixo do Mínimo' : 'Filtrar Estoque Crítico'}
        </button>
      </div>

      {/* Tabela de Produtos */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-xl shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 font-semibold uppercase tracking-wider text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400">
              <tr>
                <th className="p-4">Produto</th>
                <th className="p-4">SKU / Cód</th>
                <th className="p-4">Preço Custo</th>
                <th className="p-4">Preço Venda</th>
                <th className="p-4">Estoque Atual</th>
                <th className="p-4">Estoque Mínimo</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {carregando ? <TableSkeleton columns={7} /> : produtos.length === 0 ? (
                <tr>
                  <td colSpan={7}><EmptyState title="Nenhum produto encontrado" description="Ajuste os filtros ou registre uma nova entrada quando houver produtos disponíveis." /></td>
                </tr>
              ) : (
                produtos.map((prod) => {
                  const qtdAtual = Number(prod.estoque_atual);
                  const qtdMin = Number(prod.estoque_minimo);

                  let statusClasse = 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200';
                  let statusBadge = null;

                  if (qtdAtual <= 0) {
                    statusClasse = 'bg-red-500/10 border-red-500/30 text-red-400';
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                        ZERADO
                      </span>
                    );
                  } else if (qtdAtual <= qtdMin) {
                    statusClasse = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                        MÍNIMO
                      </span>
                    );
                  }

                  return (
                    <tr key={prod.id} className="transition odd:bg-slate-50/70 hover:bg-red-50 dark:odd:bg-slate-950/25 dark:hover:bg-red-500/5">
                      <td className="p-4">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{prod.nome}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Aplicação: {prod.marca || 'Geral'}</p>
                      </td>
                      <td className="p-4">
                        <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                          {prod.sku}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">
                        R$ {Number(prod.preco_custo || 0).toFixed(2)}
                      </td>
                      <td className="p-4 font-bold text-red-400">
                        R$ {Number(prod.valor_preco_fixado).toFixed(2)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-xl border font-bold font-mono text-xs ${statusClasse}`}>
                            {qtdAtual} {prod.unidade_comercial}
                          </span>
                          {statusBadge}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                        {qtdMin} {prod.unidade_comercial}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setProdutoMovimentar(prod); setQtdEntrada(1); }}
                            className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 transition"
                            title="Entrada Individual de Estoque"
                          >
                            <PlusCircle size={15} />
                          </button>

                          <button
                            onClick={() => { setProdutoEditar(prod); setFormEdicao(prod); }}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 transition hover:border-red-500/50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-white"
                            title="Editar Dados do Produto"
                          >
                            <Edit size={15} />
                          </button>

                          <button
                            onClick={() => setProdutoInativar(prod)}
                            className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition"
                            title="Inativar Produto"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Entrada em Lote (Diversos Equipamentos de uma Vez) */}
      {modalLoteAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 flex-shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2 text-emerald-400">
                <ListPlus size={20} /> Entrada de Estoque em Lote (Múltiplos Produtos)
              </h3>
              <button onClick={() => setModalLoteAberto(false)} className="text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
              {/* Coluna Esquerda: Buscar e Adicionar Produtos */}
              <div className="flex flex-col border-r border-slate-200 dark:border-slate-800 pr-0 md:pr-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">1. Selecione os Equipamentos</p>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 text-slate-500 dark:text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Pesquisar produto por nome ou SKU..."
                    value={buscaLote}
                    onChange={(e) => setBuscaLote(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="overflow-y-auto flex-1 space-y-2 pr-1 max-h-[300px]">
                  {produtosFiltradosLote.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => adicionarAoLote(prod)}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 hover:border-emerald-500/50 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{prod.nome}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">SKU: {prod.sku} | Atual: {prod.estoque_atual} {prod.unidade_comercial}</p>
                      </div>
                      <button className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna Direita: Lote Atual e Quantidades */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">2. Defina as Quantidades a Adicionar</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {itensLote.length} item(s) no lote
                  </span>
                </div>

                <div className="overflow-y-auto flex-1 space-y-2 pr-1 max-h-[300px]">
                  {itensLote.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 text-xs">
                      <ListPlus size={32} className="mb-2 opacity-50 text-slate-500 dark:text-slate-400" />
                      Clique nos produtos da coluna ao lado para montar a lista de entrada.
                    </div>
                  ) : (
                    itensLote.map((item) => (
                      <div
                        key={item.produto.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.produto.nome}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Atual: {item.produto.estoque_atual} &rarr; <span className="text-emerald-400 font-bold">Novo: {(Number(item.produto.estoque_atual) + Number(item.quantidade)).toFixed(1)}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => atualizarQtdLote(item.produto.id, item.quantidade - 1)}
                            disabled={item.quantidade <= 1}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            aria-label={`Diminuir quantidade de ${item.produto.nome}`}
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            value={item.quantidade}
                            onChange={(e) => atualizarQtdLote(item.produto.id, parseInt(e.target.value, 10) || 1)}
                            className="w-16 p-1.5 text-center text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-400 outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={() => atualizarQtdLote(item.produto.id, item.quantidade + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700"
                            aria-label={`Aumentar quantidade de ${item.produto.nome}`}
                          >
                            <Plus size={14} />
                          </button>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{item.produto.unidade_comercial}</span>
                          <button
                            onClick={() => removerDoLote(item.produto.id)}
                            className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-400 transition"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <button
                onClick={() => setItensLote([])}
                disabled={itensLote.length === 0}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-400 disabled:opacity-30 transition font-bold"
              >
                Limpar Lista
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setModalLoteAberto(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={processarEntradaLote}
                  disabled={itensLote.length === 0 || carregando}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
                >
                  <CheckCircle2 size={16} /> Confirmar Entrada em Lote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Entrada Individual de Lote */}
      {produtoMovimentar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <PlusCircle className="text-emerald-400" size={18} /> Entrada de Lote no Estoque
              </h3>
              <button onClick={() => setProdutoMovimentar(null)} className="text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{produtoMovimentar.nome}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Estoque Atual: {produtoMovimentar.estoque_atual} {produtoMovimentar.unidade_comercial}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Quantidade a ser Adicionada
              </label>
              <input
                type="number"
                min="1"
                step={produtoMovimentar.unidade_comercial === 'KG' ? '0.1' : '1'}
                value={qtdEntrada}
                onChange={(e) => setQtdEntrada(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Novo Estoque Previsto:</span>
                <span className="font-bold text-emerald-400">
                  {(Number(produtoMovimentar.estoque_atual) + Number(qtdEntrada || 0)).toFixed(1)} {produtoMovimentar.unidade_comercial}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setProdutoMovimentar(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={processarEntradaEstoque}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition"
              >
                Confirmar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Produto */}
      {produtoEditar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit className="text-red-500" size={18} /> Editar Produto
              </h3>
              <button onClick={() => setProdutoEditar(null)} className="text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  value={formEdicao.nome || ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, nome: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">SKU / Código</label>
                <input
                  type="text"
                  value={formEdicao.sku || ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, sku: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Aplicação/Modelo</label>
                <input
                  type="text"
                  value={formEdicao.marca || ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, marca: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Preço de Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formEdicao.preco_custo || ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, preco_custo: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Preço de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formEdicao.valor_preco_fixado || ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, valor_preco_fixado: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white font-bold text-red-400 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Estoque Mínimo</label>
                <input
                  type="number"
                  value={formEdicao.estoque_minimo || ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, estoque_minimo: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Unidade</label>
                <select
                  value={formEdicao.unidade_comercial || 'UN'}
                  onChange={(e) => setFormEdicao({ ...formEdicao, unidade_comercial: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white outline-none"
                >
                  <option value="UN">UN (Unidade)</option>
                  <option value="KG">KG (Quilograma)</option>
                  <option value="CX">CX (Caixa)</option>
                  <option value="L">L (Litro)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setProdutoEditar(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={processarEdicao}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Inativação */}
      {produtoInativar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle size={28} />
              <h3 className="text-lg font-bold">Inativar Produto?</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              O produto <strong className="text-slate-800 dark:text-slate-200">{produtoInativar.nome}</strong> deixará de ser exibido na lista de vendas do PDV e no catálogo ativo.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setProdutoInativar(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                Voltar
              </button>
              <button
                onClick={processarInativacao}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
