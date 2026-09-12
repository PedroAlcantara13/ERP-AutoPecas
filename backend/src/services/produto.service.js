// backend/src/services/produto.service.js
const pool = require('../config/database');

async function garantirColunaAtivo() {
  await pool.query(`ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true`);
}

async function listarProdutos(filtros = {}) {
  await garantirColunaAtivo();
  const { busca, somenteBaixoEstoque } = filtros;

  let sql = `
    SELECT 
      id,
      nome,
      sku,
      codigo_interno,
      modelo_aplicacao,
      valor_custo,
      valor_venda,
      estoque_atual,
      estoque_minimo,
      unidade_medida,
      COALESCE(ativo, true) AS ativo,
      criado_em
    FROM produtos
    WHERE COALESCE(ativo, true) = true
  `;
  const params = [];

  if (busca && busca.trim()) {
    params.push(`%${busca.trim().toLowerCase()}%`);
    const idx = params.length;
    sql += ` AND (
      LOWER(nome) LIKE $${idx} OR 
      LOWER(sku) LIKE $${idx} OR 
      LOWER(COALESCE(codigo_interno, '')) LIKE $${idx} OR 
      LOWER(COALESCE(modelo_aplicacao, '')) LIKE $${idx}
    )`;
  }

  if (somenteBaixoEstoque === 'true') {
    sql += ` AND estoque_atual <= estoque_minimo`;
  }

  sql += ` ORDER BY nome ASC`;

  const { rows } = await pool.query(sql, params);
  return rows;
}

async function cadastrarProduto(dados) {
  await garantirColunaAtivo();
  const { nome, sku, marca, codigo_interno, modelo_aplicacao, unidade_medida, valor_custo, valor_venda, estoque_atual, estoque_minimo } = dados;
  if (!nome || !sku || valor_venda === undefined || valor_venda === '') {
    const err = new Error('Nome, SKU e preço de venda são obrigatórios.');
    err.status = 400;
    throw err;
  }
  const { rows } = await pool.query(`
    INSERT INTO produtos (nome, sku, marca, codigo_interno, modelo_aplicacao, unidade_medida, valor_custo, valor_venda, estoque_atual, estoque_minimo, ativo)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
    RETURNING *
  `, [nome.trim(), sku.trim(), marca || null, codigo_interno || null, modelo_aplicacao || null, unidade_medida || 'UN', Number(valor_custo) || 0, Number(valor_venda), Number(estoque_atual) || 0, Number(estoque_minimo) || 0]);
  return rows[0];
}

async function obterProdutoPorId(id) {
  await garantirColunaAtivo();
  const { rows } = await pool.query('SELECT * FROM produtos WHERE id = $1', [id]);
  if (rows.length === 0) {
    const err = new Error('Produto não encontrado.');
    err.status = 404;
    throw err;
  }
  return rows[0];
}

async function atualizarProduto(id, dados) {
  await garantirColunaAtivo();
  const {
    nome,
    sku,
    codigo_interno,
    modelo_aplicacao,
    valor_custo,
    valor_venda,
    estoque_minimo,
    unidade_medida
  } = dados;

  const sql = `
    UPDATE produtos
    SET 
      nome = $1,
      sku = $2,
      codigo_interno = $3,
      modelo_aplicacao = $4,
      valor_custo = $5,
      valor_venda = $6,
      estoque_minimo = $7,
      unidade_medida = $8
    WHERE id = $9 AND COALESCE(ativo, true) = true
    RETURNING *
  `;

  const { rows } = await pool.query(sql, [
    nome,
    sku,
    codigo_interno || null,
    modelo_aplicacao || null,
    Number(valor_custo) || 0,
    Number(valor_venda),
    Number(estoque_minimo) || 0,
    unidade_medida || 'UN',
    id
  ]);

  if (rows.length === 0) {
    const err = new Error('Produto não encontrado ou inativo.');
    err.status = 404;
    throw err;
  }

  return rows[0];
}

async function adicionarEstoque(id, quantidade) {
  await garantirColunaAtivo();
  const qtd = Number(quantidade);

  if (isNaN(qtd) || qtd <= 0) {
    const err = new Error('A quantidade de entrada deve ser maior que zero.');
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `UPDATE produtos 
     SET estoque_atual = estoque_atual + $1 
     WHERE id = $2 AND COALESCE(ativo, true) = true 
     RETURNING *`,
    [qtd, id]
  );

  if (rows.length === 0) {
    const err = new Error('Produto não encontrado ou inativo.');
    err.status = 404;
    throw err;
  }

  return rows[0];
}

async function inativarProduto(id) {
  await garantirColunaAtivo();
  const { rows } = await pool.query(
    'UPDATE produtos SET ativo = false WHERE id = $1 RETURNING id',
    [id]
  );

  if (rows.length === 0) {
    const err = new Error('Produto não encontrado.');
    err.status = 404;
    throw err;
  }

  return { mensagem: 'Produto inativado/removido do estoque com sucesso!' };
}

module.exports = {
  cadastrarProduto,
  listarProdutos,
  obterProdutoPorId,
  atualizarProduto,
  adicionarEstoque,
  inativarProduto
};
