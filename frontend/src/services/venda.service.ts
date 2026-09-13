// src/services/venda.service.ts
import { api } from './api';

export interface VendaListItem {
  id: number;
  data: string;
  cliente_nome: string;
  cliente_documento?: string;
  forma_pagamento: string;
  total: number;
  desconto: number;
  usuario: string;
  status: 'CONCLUIDA' | 'CANCELADA';
}

export interface ItemVendaDetalhe {
  id: number;
  produto_id: number;
  produto_nome: string;
  sku: string;
  unidade_comercial: string;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
}

export interface VendaDetalhe extends VendaListItem {
  itens: ItemVendaDetalhe[];
}

export const vendaService = {
  finalizar: async (payload: any) => {
    const response = await api.post('/vendas', payload);
    return response.data;
  },

  listar: async (filtros?: { periodo?: string; busca?: string }): Promise<VendaListItem[]> => {
    const response = await api.get('/vendas', { params: filtros });
    return response.data;
  },

  obterPorId: async (id: number): Promise<VendaDetalhe> => {
    const response = await api.get(`/vendas/${id}`);
    return response.data;
  },

  cancelar: async (id: number): Promise<{ mensagem: string }> => {
    const response = await api.delete(`/vendas/${id}`);
    return response.data;
  }
};
