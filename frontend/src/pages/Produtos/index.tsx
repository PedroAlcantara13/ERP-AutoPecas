import React, { useState, useEffect } from 'react';
import { Plus, Package, RefreshCw } from 'lucide-react';
import { produtoService, type Produto } from '../../services/produto.service';
import { EmptyState, TableSkeleton } from '../../components/Feedback';
import { useToast } from '../../contexts/ToastContext';

export const TelaProdutos: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [exibirModal, setExibirModal] = useState(false);

  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    sku: '',
    marca: '',
    modelo_aplicacao: '',
    unidade_medida: 'UN' as 'UN' | 'KG',
    valor_custo: 0,
    valor_venda: 0,
    estoque_atual: 0,
    estoque_minimo: 0,
  });
  const { toast } = useToast();

  const carregar = async () => {
    try {
      setCarregando(true);
      const dados = await produtoService.listar();
      setProdutos(dados);
    } catch {
      toast('Erro ao carregar produtos.', 'error');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await produtoService.cadastrar(novoProduto);
      toast('Produto cadastrado com sucesso.');
      setExibirModal(false);
      carregar();
    } catch (err: any) {
      toast(err.response?.data?.mensagem || 'Erro ao cadastrar produto.', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-red-500" /> Cadastro de Produtos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Gerencie o catálogo de autopeças</p>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setExibirModal(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 font-bold text-sm rounded-xl flex items-center gap-2">
            <Plus size={18} /> Novo Produto
          </button>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-xl shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-black/10">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-slate-200 bg-slate-100/95 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400">
            <tr>
              <th className="p-4">SKU</th>
              <th className="p-4">Nome</th>
              <th className="p-4">Aplicação</th>
              <th className="p-4">Preço Venda</th>
              <th className="p-4">Estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {carregando ? <TableSkeleton columns={5} /> : produtos.length === 0 ? <tr><td colSpan={5}><EmptyState title="Nenhum produto cadastrado" description="Cadastre o primeiro produto para iniciar as operações do PDV." action={<button onClick={() => setExibirModal(true)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Novo produto</button>} /></td></tr> : produtos.map((p) => (
              <tr key={p.id} className="transition odd:bg-slate-50/70 hover:bg-red-50 dark:odd:bg-slate-950/25 dark:hover:bg-red-500/5">
                <td className="p-4 font-mono text-red-400">{p.sku}</td>
                <td className="p-4 font-semibold">{p.nome}</td>
                <td className="p-4 text-slate-500 dark:text-slate-400">{p.modelo_aplicacao || '-'}</td>
                <td className="p-4 font-bold text-green-400">R$ {Number(p.valor_venda).toFixed(2)}</td>
                <td className="p-4">{p.estoque_atual} {p.unidade_medida}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Cadastro */}
      {exibirModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <h2 className="text-lg font-bold">Cadastrar Novo Produto</h2>
            <input required placeholder="Nome do Produto" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoProduto({ ...novoProduto, nome: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="SKU" className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoProduto({ ...novoProduto, sku: e.target.value })} />
              <input placeholder="Marca" className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoProduto({ ...novoProduto, marca: e.target.value })} />
            </div>
            <input placeholder="Aplicação (ex: Gol G5 1.0)" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoProduto({ ...novoProduto, modelo_aplicacao: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.01" required placeholder="Preço Custo (R$)" className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoProduto({ ...novoProduto, valor_custo: parseFloat(e.target.value) || 0 })} />
              <input type="number" step="0.01" required placeholder="Preço Venda (R$)" className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoProduto({ ...novoProduto, valor_venda: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" required placeholder="Estoque Inicial" className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoProduto({ ...novoProduto, estoque_atual: parseFloat(e.target.value) || 0 })} />
              <input type="number" placeholder="Estoque Mínimo" className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoProduto({ ...novoProduto, estoque_minimo: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setExibirModal(false)} className="px-4 py-2 bg-gray-800 rounded-xl font-semibold">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-red-600 font-bold rounded-xl">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
