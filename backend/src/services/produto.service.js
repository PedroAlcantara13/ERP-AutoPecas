const pool = require('../config/database');

const campos = ['nome', 'marca', 'fornecedor_padrao', 'codigo_nfe', 'codigo_fornecedor_padrao', 'ean', 'ncm', 'cfop', 'preco_custo', 'valor_preco_fixado', 'unidade_comercial', 'sku', 'estoque_atual', 'estoque_minimo'];

function texto(valor) { return typeof valor === 'string' && valor.trim() ? valor.trim() : null; }
function numero(valor, padrao = 0) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  const convertido = Number(valor);
  if (!Number.isFinite(convertido)) { const erro = new Error('Os campos numéricos devem conter valores válidos.'); erro.status = 400; throw erro; }
  return convertido;
}
function normalizar(dados = {}) {
  return { nome: texto(dados.nome), marca: texto(dados.marca), fornecedor_padrao: texto(dados.fornecedor_padrao), codigo_nfe: texto(dados.codigo_nfe), codigo_fornecedor_padrao: texto(dados.codigo_fornecedor_padrao), ean: texto(dados.ean), ncm: texto(dados.ncm), cfop: texto(dados.cfop), preco_custo: numero(dados.preco_custo), valor_preco_fixado: numero(dados.valor_preco_fixado), unidade_comercial: texto(dados.unidade_comercial) || 'UN', sku: texto(dados.sku), estoque_atual: numero(dados.estoque_atual), estoque_minimo: numero(dados.estoque_minimo) };
}
function validar(produto) {
  if (!produto.nome || produto.valor_preco_fixado < 0 || produto.preco_custo < 0 || produto.estoque_atual < 0 || produto.estoque_minimo < 0) { const erro = new Error('Nome é obrigatório e valores monetários/estoques não podem ser negativos.'); erro.status = 400; throw erro; }
}
function tratarErroUnico(erro) { if (erro.code === '23505') { erro.message = 'Já existe um produto cadastrado com este SKU.'; erro.status = 400; } return erro; }

async function listarProdutos(filtros = {}) {
  const valores = [];
  const condicoes = ['ativo = true'];
  if (filtros.busca?.trim()) {
    valores.push(`%${filtros.busca.trim()}%`);
    const indice = valores.length;
    condicoes.push(`(nome ILIKE $${indice} OR COALESCE(sku, '') ILIKE $${indice} OR COALESCE(ean, '') ILIKE $${indice} OR COALESCE(codigo_nfe, '') ILIKE $${indice})`);
  }
  if (filtros.somenteBaixoEstoque === 'true' || filtros.somenteBaixoEstoque === true) condicoes.push('estoque_atual <= estoque_minimo');
  const { rows } = await pool.query(`SELECT ${campos.join(', ')}, id, ativo, criado_em FROM produtos WHERE ${condicoes.join(' AND ')} ORDER BY nome ASC`, valores);
  return rows;
}

async function cadastrarProduto(dados) {
  const produto = normalizar(dados); validar(produto);
  try {
    const { rows } = await pool.query(`INSERT INTO produtos (${campos.join(', ')}, ativo) VALUES (${campos.map((_, indice) => `$${indice + 1}`).join(', ')}, true) RETURNING *`, campos.map((campo) => produto[campo]));
    return rows[0];
  } catch (erro) { throw tratarErroUnico(erro); }
}
async function obterProdutoPorId(id) {
  const { rows } = await pool.query('SELECT * FROM produtos WHERE id = $1', [id]);
  if (!rows[0]) { const erro = new Error('Produto não encontrado.'); erro.status = 404; throw erro; }
  return rows[0];
}
async function atualizarProduto(id, dados) {
  const produto = normalizar(dados); validar(produto);
  try {
    const valores = [...campos.map((campo) => produto[campo]), id];
    const { rows } = await pool.query(`UPDATE produtos SET ${campos.map((campo, indice) => `${campo} = $${indice + 1}`).join(', ')} WHERE id = $${valores.length} AND ativo = true RETURNING *`, valores);
    if (!rows[0]) { const erro = new Error('Produto não encontrado ou inativo.'); erro.status = 404; throw erro; }
    return rows[0];
  } catch (erro) { throw tratarErroUnico(erro); }
}
async function adicionarEstoque(id, quantidade) {
  const qtd = numero(quantidade);
  if (qtd <= 0) { const erro = new Error('A quantidade de entrada deve ser maior que zero.'); erro.status = 400; throw erro; }
  const { rows } = await pool.query('UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2 AND ativo = true RETURNING *', [qtd, id]);
  if (!rows[0]) { const erro = new Error('Produto não encontrado ou inativo.'); erro.status = 404; throw erro; }
  return rows[0];
}
async function inativarProduto(id) {
  const { rows } = await pool.query('UPDATE produtos SET ativo = false WHERE id = $1 RETURNING id', [id]);
  if (!rows[0]) { const erro = new Error('Produto não encontrado.'); erro.status = 404; throw erro; }
  return { mensagem: 'Produto inativado com sucesso.' };
}
module.exports = { cadastrarProduto, listarProdutos, obterProdutoPorId, atualizarProduto, adicionarEstoque, inativarProduto };
