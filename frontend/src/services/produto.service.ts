import { api } from './api';
// src/services/produto.service.ts

export interface Produto {
  id: number;
  nome: string;
  sku: string;
  codigo_interno?: string;
  modelo_aplicacao?: string;
  valor_custo: number;
  valor_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  ativo?: boolean;
}

export const produtoService = {
  cadastrar: async (produto: Omit<Produto, 'id'> | Partial<Produto>): Promise<Produto> => {
    const response = await api.post('/produtos', produto);
    return response.data;
  },

  listar: async (filtros?: { busca?: string; somenteBaixoEstoque?: boolean }): Promise<Produto[]> => {
    const response = await api.get('/produtos', {
      params: {
        busca: filtros?.busca,
        somenteBaixoEstoque: filtros?.somenteBaixoEstoque ? 'true' : undefined
      }
    });
    return response.data;
  },

  obterPorId: async (id: number): Promise<Produto> => {
    const response = await api.get(`/produtos/${id}`);
    return response.data;
  },

  atualizar: async (id: number, payload: Partial<Produto>): Promise<Produto> => {
    const response = await api.put(`/produtos/${id}`, payload);
    return response.data;
  },

  adicionarEstoque: async (id: number, quantidade: number): Promise<Produto> => {
    const response = await api.post(`/produtos/${id}/estoque`, { quantidade });
    return response.data;
  },

  inativar: async (id: number): Promise<{ mensagem: string }> => {
    const response = await api.delete(`/produtos/${id}`);
    return response.data;
  }
};
