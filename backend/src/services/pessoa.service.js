const pool = require('../config/database');

const campos = [
  'pessoa_fisica', 'nome_fantasia', 'cnpj_cpf', 'logradouro', 'numero',
  'complemento', 'bairro', 'cidade', 'whatsapp', 'cliente', 'fornecedor'
];

function normalizarDados(dados = {}) {
  return {
    pessoa_fisica: dados.pessoa_fisica !== false,
    nome_fantasia: String(dados.nome_fantasia || '').trim(),
    cnpj_cpf: dados.cnpj_cpf?.trim() || null,
    logradouro: dados.logradouro?.trim() || null,
    numero: dados.numero?.trim() || null,
    complemento: dados.complemento?.trim() || null,
    bairro: dados.bairro?.trim() || null,
    cidade: dados.cidade?.trim() || null,
    whatsapp: dados.whatsapp?.trim() || null,
    cliente: dados.cliente !== false,
    fornecedor: dados.fornecedor === true
  };
}

function validar(dados) {
  if (!dados.nome_fantasia) {
    const erro = new Error('Nome/Razão social é obrigatório.');
    erro.status = 400;
    throw erro;
  }
  if (!dados.cliente && !dados.fornecedor) {
    const erro = new Error('Informe se a pessoa é cliente, fornecedor ou ambos.');
    erro.status = 400;
    throw erro;
  }
}

async function criarPessoa(dados) {
  const pessoa = normalizarDados(dados);
  validar(pessoa);
  try {
    const valores = campos.map((campo) => pessoa[campo]);
    const { rows } = await pool.query(
      `INSERT INTO pessoas (${campos.join(', ')})
       VALUES (${campos.map((_, indice) => `$${indice + 1}`).join(', ')})
       RETURNING *`,
      valores
    );
    return rows[0];
  } catch (erro) {
    if (erro.code === '23505') {
      erro.message = 'Já existe uma pessoa cadastrada com este CPF/CNPJ.';
      erro.status = 400;
    }
    throw erro;
  }
}

async function listarPessoas(filtros = {}) {
  const { busca, cliente, fornecedor } = filtros;
  const condicoes = [];
  const valores = [];

  if (cliente === 'true' || cliente === true) condicoes.push('cliente = true');
  if (fornecedor === 'true' || fornecedor === true) condicoes.push('fornecedor = true');
  if (busca?.trim()) {
    valores.push(`%${busca.trim()}%`);
    condicoes.push(`(nome_fantasia ILIKE $${valores.length} OR COALESCE(cnpj_cpf, '') ILIKE $${valores.length})`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM pessoas ${where} ORDER BY nome_fantasia ASC`, valores);
  return rows;
}

async function obterPessoaPorId(id) {
  const { rows } = await pool.query('SELECT * FROM pessoas WHERE id = $1', [id]);
  if (!rows[0]) {
    const erro = new Error('Pessoa não encontrada.');
    erro.status = 404;
    throw erro;
  }
  return rows[0];
}

async function atualizarPessoa(id, dados) {
  const pessoa = normalizarDados(dados);
  validar(pessoa);
  try {
    const valores = [...campos.map((campo) => pessoa[campo]), id];
    const { rows } = await pool.query(
      `UPDATE pessoas SET ${campos.map((campo, indice) => `${campo} = $${indice + 1}`).join(', ')}
       WHERE id = $${valores.length} RETURNING *`,
      valores
    );
    if (!rows[0]) {
      const erro = new Error('Pessoa não encontrada.');
      erro.status = 404;
      throw erro;
    }
    return rows[0];
  } catch (erro) {
    if (erro.code === '23505') {
      erro.message = 'Já existe uma pessoa cadastrada com este CPF/CNPJ.';
      erro.status = 400;
    }
    throw erro;
  }
}

async function excluirPessoa(id) {
  try {
    const { rowCount } = await pool.query('DELETE FROM pessoas WHERE id = $1', [id]);
    if (!rowCount) {
      const erro = new Error('Pessoa não encontrada.');
      erro.status = 404;
      throw erro;
    }
    return { mensagem: 'Pessoa excluída com sucesso.' };
  } catch (erro) {
    if (erro.code === '23503') {
      erro.message = 'Não é possível excluir uma pessoa vinculada a vendas.';
      erro.status = 409;
    }
    throw erro;
  }
}

module.exports = { criarPessoa, listarPessoas, obterPessoaPorId, atualizarPessoa, excluirPessoa };
