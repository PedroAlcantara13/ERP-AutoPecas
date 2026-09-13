import { api } from './api';

export type StatusOrcamento = 'pendente' | 'aprovado' | 'cancelado';

export interface OrcamentoItem {
  id?: number;
  produto_id: number;
  produto_nome: string;
  sku?: string | null;
  unidade_comercial: string;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
  estoque_atual?: number;
}

export interface Orcamento {
  id: number;
  cliente_id?: number | null;
  cliente_nome: string;
  cliente_documento?: string | null;
  desconto: number;
  total: number;
  status: StatusOrcamento;
  venda_id?: number | null;
  criado_em: string;
  atualizado_em?: string;
  itens?: OrcamentoItem[];
}

export interface OrcamentoPayload {
  cliente_id?: number | null;
  desconto: number;
  itens: Pick<OrcamentoItem, 'produto_id' | 'quantidade' | 'valor_unitario'>[];
}

export const orcamentoService = {
  listar: async (filtros?: { busca?: string; periodo?: string; status?: StatusOrcamento }): Promise<Orcamento[]> => (await api.get('/orcamentos', { params: filtros })).data,
  obter: async (id: number): Promise<Orcamento> => (await api.get(`/orcamentos/${id}`)).data,
  criar: async (dados: OrcamentoPayload): Promise<Orcamento> => (await api.post('/orcamentos', dados)).data,
  atualizar: async (id: number, dados: OrcamentoPayload): Promise<Orcamento> => (await api.put(`/orcamentos/${id}`, dados)).data,
  cancelar: async (id: number): Promise<{ mensagem: string }> => (await api.delete(`/orcamentos/${id}`)).data,
  aprovar: async (id: number, forma_pagamento: string): Promise<{ mensagem: string; venda_id: number }> => (await api.post(`/orcamentos/${id}/aprovar`, { forma_pagamento })).data
};
