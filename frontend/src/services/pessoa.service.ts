import { api } from './api';

export interface Pessoa {
  id?: number;
  pessoa_fisica: boolean;
  nome_fantasia: string;
  cnpj_cpf?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  whatsapp?: string | null;
  cliente: boolean;
  fornecedor: boolean;
  criado_em?: string;
}

export const pessoaService = {
  listar: async (filtros?: { busca?: string; cliente?: boolean; fornecedor?: boolean }): Promise<Pessoa[]> => (await api.get('/pessoas', { params: { busca: filtros?.busca, cliente: filtros?.cliente ? 'true' : undefined, fornecedor: filtros?.fornecedor ? 'true' : undefined } })).data,
  obterPorId: async (id: number): Promise<Pessoa> => (await api.get(`/pessoas/${id}`)).data,
  cadastrar: async (pessoa: Omit<Pessoa, 'id' | 'criado_em'>): Promise<Pessoa> => (await api.post('/pessoas', pessoa)).data,
  atualizar: async (id: number, pessoa: Omit<Pessoa, 'id' | 'criado_em'>): Promise<Pessoa> => (await api.put(`/pessoas/${id}`, pessoa)).data,
  excluir: async (id: number): Promise<{ mensagem: string }> => (await api.delete(`/pessoas/${id}`)).data
};
