import { api } from './api';

export interface Produto {
  id: number;
  nome: string;
  marca?: string | null;
  fornecedor_padrao?: string | null;
  codigo_nfe?: string | null;
  codigo_fornecedor_padrao?: string | null;
  ean?: string | null;
  ncm?: string | null;
  cfop?: string | null;
  preco_custo: number;
  valor_preco_fixado: number;
  unidade_comercial: string;
  sku?: string | null;
  estoque_atual: number;
  estoque_minimo: number;
  ativo?: boolean;
}

export const produtoService = {
  cadastrar: async (produto: Omit<Produto, 'id'> | Partial<Produto>): Promise<Produto> => (await api.post('/produtos', produto)).data,
  listar: async (filtros?: { busca?: string; somenteBaixoEstoque?: boolean }): Promise<Produto[]> => (await api.get('/produtos', { params: { busca: filtros?.busca, somenteBaixoEstoque: filtros?.somenteBaixoEstoque ? 'true' : undefined } })).data,
  obterPorId: async (id: number): Promise<Produto> => (await api.get(`/produtos/${id}`)).data,
  atualizar: async (id: number, payload: Partial<Produto>): Promise<Produto> => (await api.put(`/produtos/${id}`, payload)).data,
  adicionarEstoque: async (id: number, quantidade: number): Promise<Produto> => (await api.post(`/produtos/${id}/estoque`, { quantidade })).data,
  inativar: async (id: number): Promise<{ mensagem: string }> => (await api.delete(`/produtos/${id}`)).data
};
