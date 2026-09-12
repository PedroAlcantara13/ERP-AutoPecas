import React, { useState, useEffect } from 'react';
import { Users, Plus } from 'lucide-react';
import { clienteService, type Cliente } from '../../services/cliente.service';
import { EmptyState, TableSkeleton } from '../../components/Feedback';
import { useToast } from '../../contexts/ToastContext';

export const TelaClientes: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [exibirModal, setExibirModal] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', cpf_cnpj: '', telefone: '', email: '' });
  const { toast } = useToast();

  const carregar = async () => {
    try {
      setCarregando(true);
      const dados = await clienteService.listar();
      setClientes(dados);
    } catch {
      toast('Não foi possível carregar os clientes.', 'error');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await clienteService.cadastrar(novoCliente);
      toast('Cliente cadastrado com sucesso.');
      setExibirModal(false);
      setNovoCliente({ nome: '', cpf_cnpj: '', telefone: '', email: '' });
      carregar();
    } catch (err: any) {
      toast(err.response?.data?.mensagem || 'Erro ao cadastrar cliente.', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-red-500" /> Cadastro de Clientes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Base de clientes e compradores</p>
        </div>
        <button onClick={() => setExibirModal(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 font-bold text-sm rounded-xl flex items-center gap-2">
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-xl shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-black/10">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-slate-200 bg-slate-100/95 text-xs uppercase text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">CPF/CNPJ</th>
              <th className="p-4">Telefone</th>
              <th className="p-4">E-mail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {carregando ? <TableSkeleton columns={4} /> : clientes.length === 0 ? <tr><td colSpan={4}><EmptyState title="Nenhum cliente cadastrado" description="Registre o primeiro cliente para agilizar as próximas vendas." action={<button onClick={() => setExibirModal(true)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Cadastrar cliente</button>} /></td></tr> : clientes.map((c) => (
              <tr key={c.id} className="transition odd:bg-slate-50/70 hover:bg-red-50 dark:odd:bg-slate-950/25 dark:hover:bg-red-500/5">
                <td className="p-4 font-semibold">{c.nome}</td>
                <td className="p-4 font-mono text-slate-500 dark:text-slate-400">{c.cpf_cnpj || '-'}</td>
                <td className="p-4">{c.telefone || '-'}</td>
                <td className="p-4 text-slate-500 dark:text-slate-400">{c.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {exibirModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <h2 className="text-lg font-bold">Cadastrar Cliente</h2>
            <input required placeholder="Nome Completo" value={novoCliente.nome} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })} />
            <input placeholder="CPF ou CNPJ" value={novoCliente.cpf_cnpj} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoCliente({ ...novoCliente, cpf_cnpj: e.target.value })} />
            <input placeholder="Telefone / WhatsApp" value={novoCliente.telefone} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoCliente({ ...novoCliente, telefone: e.target.value })} />
            <input type="email" placeholder="E-mail" value={novoCliente.email} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" onChange={e => setNovoCliente({ ...novoCliente, email: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setExibirModal(false)} className="rounded-xl bg-slate-100 px-4 py-2 dark:bg-slate-800">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-red-600 font-bold rounded-xl">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
