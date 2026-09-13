import { useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { pessoaService, type Pessoa } from '../../services/pessoa.service';
import { EmptyState, TableSkeleton } from '../../components/Feedback';
import { Button, IconButton, Modal, PageHeader, StatusBadge } from '../../components/UI';
import { useToast } from '../../contexts/ToastContext';

const pessoaVazia = (): Omit<Pessoa, 'id' | 'criado_em'> => ({ pessoa_fisica: true, nome_fantasia: '', cnpj_cpf: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', whatsapp: '', cliente: true, fornecedor: false });

export function TelaClientes() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [formulario, setFormulario] = useState(pessoaVazia());
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'cliente' | 'fornecedor'>('todos');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [pessoaParaExcluir, setPessoaParaExcluir] = useState<Pessoa | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  const carregar = async () => { try { setCarregando(true); setPessoas(await pessoaService.listar()); } catch { toast('Não foi possível carregar as pessoas.', 'error'); } finally { setCarregando(false); } };
  useEffect(() => { carregar(); }, []);
  const pessoasFiltradas = useMemo(() => pessoas.filter(pessoa => {
    const termo = busca.toLowerCase().trim();
    const combinaBusca = !termo || `${pessoa.nome_fantasia} ${pessoa.cnpj_cpf || ''} ${pessoa.whatsapp || ''} ${pessoa.cidade || ''}`.toLowerCase().includes(termo);
    const combinaTipo = tipoFiltro === 'todos' || (tipoFiltro === 'cliente' ? pessoa.cliente : pessoa.fornecedor);
    return combinaBusca && combinaTipo;
  }), [pessoas, busca, tipoFiltro]);

  const abrirNovo = () => { setFormulario(pessoaVazia()); setEditandoId(null); setModalAberto(true); };
  const abrirEdicao = (pessoa: Pessoa) => { const { id, criado_em, ...dados } = pessoa; setFormulario(dados); setEditandoId(id!); setModalAberto(true); };
  const salvar = async (event: React.FormEvent) => { event.preventDefault(); try { setSalvando(true); if (editandoId) await pessoaService.atualizar(editandoId, formulario); else await pessoaService.cadastrar(formulario); toast(editandoId ? 'Pessoa atualizada com sucesso.' : 'Pessoa cadastrada com sucesso.'); setModalAberto(false); await carregar(); } catch (erro: any) { toast(erro.response?.data?.mensagem || 'Não foi possível salvar a pessoa.', 'error'); } finally { setSalvando(false); } };
  const excluir = async () => { if (!pessoaParaExcluir?.id) return; try { await pessoaService.excluir(pessoaParaExcluir.id); toast('Pessoa excluída.'); setPessoaParaExcluir(null); await carregar(); } catch (erro: any) { toast(erro.response?.data?.mensagem || 'Não foi possível excluir a pessoa.', 'error'); } };
  const atualizar = <K extends keyof typeof formulario>(campo: K, valor: (typeof formulario)[K]) => setFormulario({ ...formulario, [campo]: valor });

  return <div className="page-shell">
    <PageHeader icon={Users} title="Pessoas" subtitle="Clientes e fornecedores centralizados em um só cadastro." actions={<Button onClick={abrirNovo}><Plus size={17} /> Nova pessoa</Button>} />
    <section className="surface">
      <div className="surface-body space-y-4"><div className="filter-bar"><div className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={busca} onChange={event => setBusca(event.target.value)} placeholder="Busque por nome, documento, WhatsApp ou cidade" className="input-field mt-0 pl-9" /></div><div className="flex shrink-0 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">{(['todos', 'cliente', 'fornecedor'] as const).map(tipo => <button key={tipo} onClick={() => setTipoFiltro(tipo)} className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${tipoFiltro === tipo ? 'bg-white text-red-600 shadow-sm dark:bg-slate-700 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{tipo === 'todos' ? 'Todos' : `${tipo}s`}</button>)}</div></div><p className="text-xs text-slate-500">{pessoasFiltradas.length} {pessoasFiltradas.length === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}</p></div>
      <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Pessoa</th><th>Documento</th><th>Contato</th><th>Localidade</th><th>Vínculo</th><th className="text-right">Ações</th></tr></thead><tbody>{carregando ? <TableSkeleton columns={6} /> : !pessoasFiltradas.length ? <tr><td colSpan={6}><EmptyState title="Nenhuma pessoa encontrada" description="Ajuste os filtros ou crie um novo cadastro." action={<button className="empty-action" onClick={abrirNovo}><Plus size={15} /> Nova pessoa</button>} /></td></tr> : pessoasFiltradas.map(pessoa => <tr key={pessoa.id}><td><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"><Building2 size={17} /></span><div><p className="font-bold">{pessoa.nome_fantasia}</p><p className="text-xs text-slate-500">{pessoa.pessoa_fisica ? 'Pessoa física' : 'Pessoa jurídica'}</p></div></div></td><td className="font-mono text-xs text-slate-600 dark:text-slate-300">{pessoa.cnpj_cpf || '—'}</td><td><p>{pessoa.whatsapp || '—'}</p></td><td>{pessoa.cidade || '—'}</td><td className="space-x-1">{pessoa.cliente && <StatusBadge status="Cliente" />}{pessoa.fornecedor && <StatusBadge status="Fornecedor" />}</td><td><div className="flex justify-end gap-1"><IconButton label="Editar pessoa" onClick={() => abrirEdicao(pessoa)}><Pencil size={16} /></IconButton><IconButton label="Excluir pessoa" className="text-red-600 hover:border-red-300 hover:text-red-700" onClick={() => setPessoaParaExcluir(pessoa)}><Trash2 size={16} /></IconButton></div></td></tr>)}</tbody></table></div>
    </section>
    {modalAberto && <Modal title={editandoId ? 'Editar pessoa' : 'Nova pessoa'} onClose={() => setModalAberto(false)} size="lg" footer={<><Button variant="secondary" type="button" onClick={() => setModalAberto(false)}>Cancelar</Button><Button form="pessoa-form" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar pessoa'}</Button></>}><form id="pessoa-form" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2"><label className="field-label sm:col-span-2">Nome / razão social<input required value={formulario.nome_fantasia} onChange={e => atualizar('nome_fantasia', e.target.value)} className="input-field" autoFocus /></label><label className="field-label">{formulario.pessoa_fisica ? 'CPF' : 'CNPJ'}<input value={formulario.cnpj_cpf || ''} onChange={e => atualizar('cnpj_cpf', e.target.value)} className="input-field" /></label><label className="field-label">WhatsApp<input inputMode="tel" value={formulario.whatsapp || ''} onChange={e => atualizar('whatsapp', e.target.value)} className="input-field" /></label><label className="field-label sm:col-span-2">Logradouro<input value={formulario.logradouro || ''} onChange={e => atualizar('logradouro', e.target.value)} className="input-field" /></label><label className="field-label">Número<input value={formulario.numero || ''} onChange={e => atualizar('numero', e.target.value)} className="input-field" /></label><label className="field-label">Complemento<input value={formulario.complemento || ''} onChange={e => atualizar('complemento', e.target.value)} className="input-field" /></label><label className="field-label">Bairro<input value={formulario.bairro || ''} onChange={e => atualizar('bairro', e.target.value)} className="input-field" /></label><label className="field-label">Cidade<input value={formulario.cidade || ''} onChange={e => atualizar('cidade', e.target.value)} className="input-field" /></label><div className="sm:col-span-2 flex flex-wrap gap-x-6 gap-y-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold dark:bg-slate-950"><label><input type="checkbox" checked={formulario.pessoa_fisica} onChange={e => atualizar('pessoa_fisica', e.target.checked)} className="mr-2" />Pessoa física</label><label><input type="checkbox" checked={formulario.cliente} onChange={e => atualizar('cliente', e.target.checked)} className="mr-2" />Cliente</label><label><input type="checkbox" checked={formulario.fornecedor} onChange={e => atualizar('fornecedor', e.target.checked)} className="mr-2" />Fornecedor</label></div></form></Modal>}
    {pessoaParaExcluir && <Modal title="Excluir pessoa?" onClose={() => setPessoaParaExcluir(null)} size="sm" footer={<><Button variant="secondary" onClick={() => setPessoaParaExcluir(null)}>Voltar</Button><Button variant="danger" onClick={excluir}>Excluir</Button></>}><p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">Deseja excluir <strong>{pessoaParaExcluir.nome_fantasia}</strong>? Essa ação não pode ser desfeita.</p></Modal>}
  </div>;
}
