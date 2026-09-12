// src/services/cliente.service.ts
import { api } from './api';

export interface Cliente {
  id?: number;
  nome: string;
  cpf_cnpj?: string;
  telefone?: string;
  email?: string;
  criado_em?: string;
}

export const clienteService = {
  listar: async (): Promise<Cliente[]> => {
    const response = await api.get('/clientes');
    return response.data;
  },

  cadastrar: async (cliente: Partial<Cliente>): Promise<Cliente> => {
    const response = await api.post('/clientes', cliente);
    return response.data;
  },
};