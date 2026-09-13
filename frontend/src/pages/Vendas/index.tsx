// src/pages/Vendas/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, FileText, Ban, Eye, Printer, AlertTriangle, RefreshCw, X, CheckCircle2, XCircle } from 'lucide-react';
import { vendaService, type VendaListItem, type VendaDetalhe } from '../../services/venda.service';
import { EmptyState, TableSkeleton } from '../../components/Feedback';

export const TelaHistoricoVendas: React.FC = () => {
  const [vendas, setVendas] = useState<VendaListItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: 'erro' | 'sucesso'; msg: string } | null>(null);

  // Filtros
  const [periodo, setPeriodo] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');
  const [somenteCrediarioPendente, setSomenteCrediarioPendente] = useState(false);

  // Modais
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaDetalhe | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [vendaParaCancelar, setVendaParaCancelar] = useState<VendaListItem | null>(null);
  const [vendaParaConfirmarPagamento, setVendaParaConfirmarPagamento] = useState<VendaListItem | null>(null);

  const carregarVendas = useCallback(async () => {
    try {
      setCarregando(true);
      setAlerta(null);
      const res = await vendaService.listar({
        periodo,
        busca,
        forma_pagamento: somenteCrediarioPendente ? 'crediario' : undefined,
        status_pagamento: somenteCrediarioPendente ? 'pendente' : undefined
      });
      setVendas(res);
    } catch {
      setAlerta({ tipo: 'erro', msg: 'Falha ao carregar o histórico de vendas.' });
    } finally {
      setCarregando(false);
    }
  }, [periodo, busca, somenteCrediarioPendente]);

  useEffect(() => {
    carregarVendas();
  }, [carregarVendas]);

  const abrirDetalhes = async (id: number) => {
    try {
      setCarregandoDetalhes(true);
      const detalhe = await vendaService.obterPorId(id);
      setVendaSelecionada(detalhe);
    } catch {
      setAlerta({ tipo: 'erro', msg: 'Não foi possível carregar os detalhes da venda.' });
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const confirmarCancelamento = async () => {
    if (!vendaParaCancelar) return;
    try {
      setCarregando(true);
      const res = await vendaService.cancelar(vendaParaCancelar.id);
      setAlerta({ tipo: 'sucesso', msg: res.mensagem });
      setVendaParaCancelar(null);
      await carregarVendas();
    } catch (err: any) {
      const msg = err.response?.data?.mensagem || 'Erro ao cancelar a venda.';
      setAlerta({ tipo: 'erro', msg });
    } finally {
      setCarregando(false);
    }
  };

  const confirmarRecebimento = async () => {
    if (!vendaParaConfirmarPagamento) return;
    try {
      setCarregando(true);
      const res = await vendaService.confirmarPagamento(vendaParaConfirmarPagamento.id);
      setAlerta({ tipo: 'sucesso', msg: res.mensagem });
      setVendaParaConfirmarPagamento(null);
      await carregarVendas();
    } catch (err: any) {
      setAlerta({ tipo: 'erro', msg: err.response?.data?.mensagem || 'Não foi possível confirmar o recebimento.' });
    } finally {
      setCarregando(false);
    }
  };

  const imprimirCupomModal = () => {
    window.print();
  };

  return (
    <div className="page-shell">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cupom-detalhe-impressao, #cupom-detalhe-impressao * { visibility: visible; }
          #cupom-detalhe-impressao {
            position: absolute; left: 0; top: 0; width: 80mm; padding: 5mm;
            font-family: monospace; font-size: 11px; color: #000; background: #fff;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Cabeçalho */}
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="text-red-500" size={24} /> Histórico de Vendas
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Consulte vendas realizadas, reimprima cupons ou efetue estornos</p>
        </div>

        <button
          onClick={carregarVendas}
          className="w-fit rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Alertas */}
      {alerta && (
        <div className={`mb-4 p-4 rounded-2xl border flex items-center justify-between no-print ${alerta.tipo === 'erro' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          <div className="flex items-center gap-3">
            {alerta.tipo === 'erro' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            <span className="text-sm font-medium">{alerta.msg}</span>
          </div>
          <button onClick={() => setAlerta(null)} className="text-xs underline font-bold">Fechar</button>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="mb-6 space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-md md:flex md:items-center md:justify-between md:space-y-0 dark:border-slate-800 dark:bg-slate-900/60 no-print">
        {/* Botões de Período */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'todos', rotulo: 'Todo o Período' },
            { id: 'mes', rotulo: 'Últimos 30 dias' },
            { id: 'semana', rotulo: 'Últimos 7 dias' },
            { id: 'hoje', rotulo: 'Hoje' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriodo(item.id)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${periodo === item.id ? 'bg-red-600 text-white' : 'border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
            >
              {item.rotulo}
            </button>
          ))}
          <button
            onClick={() => setSomenteCrediarioPendente((ativo) => !ativo)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${somenteCrediarioPendente ? 'bg-amber-500 text-slate-950' : 'border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
          >
            Crediário / Pendentes
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por código (#Nº) ou nome do cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-900 outline-none transition focus:border-red-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-xl shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-black/10 no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 font-semibold uppercase tracking-wider text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400">
              <tr>
                <th className="p-4">Cód. Venda</th>
                <th className="p-4">Data e Hora</th>
                <th className="p-4">Pessoa</th>
                <th className="p-4">Pagamento</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {carregando ? <TableSkeleton columns={7} /> : vendas.length === 0 ? (
                <tr>
                  <td colSpan={7}><EmptyState title="Nenhuma venda encontrada" description="Altere o período ou os termos de pesquisa para localizar uma venda." /></td>
                </tr>
              ) : (
                vendas.map((venda) => {
                  const statusPagamento = String(venda.status_pagamento || '').toLowerCase().trim();
                  const isPendente = statusPagamento === 'pendente';
                  const isCancelada = String(venda.status || '').toUpperCase().trim() === 'CANCELADA';
                  const formaPagamento = String(venda.forma_pagamento || '').toLowerCase().trim();

                  return (
                    <tr key={venda.id} className="transition odd:bg-slate-50/70 hover:bg-red-50 dark:odd:bg-slate-950/25 dark:hover:bg-red-500/5">
                      <td className="p-4 font-mono font-bold text-red-400">#{venda.id}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-500" />
                          {new Date(venda.data).toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{venda.cliente_nome}</p>
                        {venda.cliente_documento && (
                          <p className="text-[10px] text-slate-500">{venda.cliente_documento}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 uppercase">
                          {formaPagamento === 'crediario' ? 'CREDIÁRIO' : venda.forma_pagamento}
                        </span>
                        <p className={`mt-1 text-[10px] font-bold ${isPendente ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {isPendente ? 'PENDENTE' : 'PAGO'}
                        </p>
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-900 dark:text-slate-100">
                        R$ {Number(venda.total).toFixed(2)}
                      </td>
                      <td className="p-4">
                        {isCancelada ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
                            <XCircle size={12} /> Cancelada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            <CheckCircle2 size={12} /> Concluída
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => abrirDetalhes(venda.id)}
                            disabled={carregandoDetalhes}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:border-red-500/50 hover:text-red-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-white"
                            title="Ver Detalhes e Cupom"
                          >
                            <Eye size={15} className={carregandoDetalhes ? 'animate-pulse' : ''} />
                          </button>
                          {isPendente && !isCancelada && (
                            <button
                              onClick={() => setVendaParaConfirmarPagamento(venda)}
                              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-[10px] font-bold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400"
                              title="Confirmar Recebimento"
                            >
                              Confirmar Recebimento
                            </button>
                          )}
                          {!isCancelada && (
                            <button
                              onClick={() => setVendaParaCancelar(venda)}
                              className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition"
                              title="Cancelar / Estornar Venda"
                            >
                              <Ban size={15} />
                            </button>
                          )}
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

      {/* Modal de Detalhes da Venda e Impressão */}
      {vendaSelecionada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-slate-900 p-6 rounded-3xl max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setVendaSelecionada(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 no-print"
            >
              <X size={20} />
            </button>

            <div id="cupom-detalhe-impressao" className="space-y-3 font-mono text-xs">
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <h3 className="font-bold text-sm uppercase">AUTOPEÇAS & OFICINA</h3>
                <p>Comprovante Não Fiscal</p>
                <p className="text-[10px] text-slate-500">{new Date(vendaSelecionada.data).toLocaleString('pt-BR')}</p>
                <p className="font-bold">Venda Nº #{vendaSelecionada.id}</p>
                {String(vendaSelecionada.status).toUpperCase() === 'CANCELADA' && (
                  <p className="text-red-600 font-bold uppercase mt-1">*** CANCELADA / ESTORNADA ***</p>
                )}
              </div>

              <div>
                <p><span className="font-bold">Pessoa:</span> {vendaSelecionada.cliente_nome}</p>
                <p><span className="font-bold">Atendente:</span> {vendaSelecionada.usuario}</p>
              </div>

              <div className="border-b border-t border-dashed border-slate-400 py-2 space-y-1">
                <div className="flex justify-between font-bold text-[10px]">
                  <span>ITEM</span>
                  <span>QTD x UNIT</span>
                  <span>TOTAL</span>
                </div>
                {vendaSelecionada.itens.map((item) => (
                  <div key={item.id} className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[140px]">{item.produto_nome}</span>
                    <span>{item.quantidade}x R${Number(item.valor_unitario).toFixed(2)}</span>
                    <span className="font-bold">R${Number(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right">
                {Number(vendaSelecionada.desconto) > 0 && (
                  <p>Desconto: -R$ {Number(vendaSelecionada.desconto).toFixed(2)}</p>
                )}
                <p className="font-bold text-sm">TOTAL: R$ {Number(vendaSelecionada.total).toFixed(2)}</p>
                <p className="text-[10px]">Forma de Pagamento: {vendaSelecionada.forma_pagamento}</p>
              </div>

              <div className="text-center border-t border-dashed border-slate-400 pt-2 text-[10px]">
                <p>Obrigado pela preferência!</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 no-print">
              <button
                onClick={imprimirCupomModal}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-sm"
              >
                <Printer size={18} /> Reimprimir Cupom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Cancelamento */}
      {vendaParaCancelar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle size={28} />
              <h3 className="text-lg font-bold">Cancelar Venda #{vendaParaCancelar.id}?</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Esta ação irá alterar o status da venda para <strong className="text-red-400">CANCELADA</strong> e <strong className="text-emerald-400">devolverá automaticamente todos os produtos ao estoque</strong>.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setVendaParaCancelar(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Voltar
              </button>
              <button
                onClick={confirmarCancelamento}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {vendaParaConfirmarPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3 text-emerald-500"><CheckCircle2 size={28} /><h3 className="text-lg font-bold">Confirmar recebimento?</h3></div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">A venda #{vendaParaConfirmarPagamento.id} será marcada como paga e receberá a data de pagamento atual.</p>
            <div className="flex gap-2 pt-2"><button onClick={() => setVendaParaConfirmarPagamento(null)} className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">Voltar</button><button onClick={confirmarRecebimento} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">Confirmar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
