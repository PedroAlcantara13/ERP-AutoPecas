const pool = require('../config/database');
const erro = (mensagem, status = 400) => Object.assign(new Error(mensagem), { status });

function agruparItens(itens) {
  if (!Array.isArray(itens) || !itens.length) throw erro('A venda deve conter ao menos um item.');
  const agrupados = new Map();
  for (const item of itens) {
    const produtoId = Number(item.produto_id); const quantidade = Number(item.quantidade);
    if (!Number.isInteger(produtoId) || produtoId <= 0 || !Number.isFinite(quantidade) || quantidade <= 0) throw erro('Cada item deve ter produto e quantidade válida maior que zero.');
    agrupados.set(produtoId, (agrupados.get(produtoId) || 0) + quantidade);
  }
  return [...agrupados.entries()].map(([produto_id, quantidade]) => ({ produto_id, quantidade })).sort((a, b) => a.produto_id - b.produto_id);
}

async function processarVenda(dados = {}) {
  const itens = agruparItens(dados.itens); const desconto = Number(dados.desconto || 0);
  if (!Number.isFinite(desconto) || desconto < 0) throw erro('Desconto inválido.');
  if (!dados.forma_pagamento?.trim()) throw erro('Forma de pagamento é obrigatória.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const clienteId = dados.cliente_id ? Number(dados.cliente_id) : null;
    if (clienteId) {
      const cliente = await client.query('SELECT id FROM pessoas WHERE id = $1 AND cliente = true', [clienteId]);
      if (!cliente.rows[0]) throw erro('Cliente não encontrado ou não habilitado para vendas.', 404);
    }
    let subtotal = 0; const itensComProduto = [];
    for (const item of itens) {
      const { rows } = await client.query('SELECT id, nome, estoque_atual, valor_preco_fixado FROM produtos WHERE id = $1 AND ativo = true FOR UPDATE', [item.produto_id]);
      const produto = rows[0];
      if (!produto) throw erro(`Produto código ${item.produto_id} não foi encontrado.`, 404);
      if (Number(produto.estoque_atual) < item.quantidade) throw erro(`Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque_atual}`);
      const valorUnitario = Number(produto.valor_preco_fixado); const subtotalItem = valorUnitario * item.quantidade;
      subtotal += subtotalItem; itensComProduto.push({ ...item, valorUnitario, subtotalItem });
    }
    const total = Math.max(0, subtotal - desconto);
    const vendaRes = await client.query(`INSERT INTO vendas (cliente_id, desconto, forma_pagamento, usuario, total, status) VALUES ($1, $2, $3, $4, $5, 'CONCLUIDA') RETURNING id, criado_em`, [clienteId, desconto, dados.forma_pagamento.trim(), dados.usuario?.trim() || 'Atendente Balcão', total]);
    const vendaId = vendaRes.rows[0].id;
    for (const item of itensComProduto) {
      await client.query('INSERT INTO itens_venda (venda_id, produto_id, quantidade, valor_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)', [vendaId, item.produto_id, item.quantidade, item.valorUnitario, item.subtotalItem]);
      await client.query('UPDATE produtos SET estoque_atual = estoque_atual - $1 WHERE id = $2', [item.quantidade, item.produto_id]);
    }
    await client.query('COMMIT');
    return { venda_id: vendaId, subtotal, desconto, total, data: vendaRes.rows[0].criado_em };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

async function listarVendas(filtros = {}) {
  const valores = []; const condicoes = ['1 = 1'];
  if (filtros.periodo === 'hoje') condicoes.push('v.criado_em >= CURRENT_DATE'); else if (filtros.periodo === 'semana') condicoes.push("v.criado_em >= CURRENT_DATE - INTERVAL '7 days'"); else if (filtros.periodo === 'mes') condicoes.push("v.criado_em >= CURRENT_DATE - INTERVAL '30 days'");
  if (filtros.busca?.trim()) { valores.push(`%${filtros.busca.trim()}%`); condicoes.push(`(p.nome_fantasia ILIKE $${valores.length} OR p.cnpj_cpf ILIKE $${valores.length} OR CAST(v.id AS TEXT) ILIKE $${valores.length})`); }
  const { rows } = await pool.query(`SELECT v.id, v.total, v.desconto, v.forma_pagamento, v.usuario, v.status, v.criado_em AS data, COALESCE(p.nome_fantasia, 'Cliente Avulso (Balcão)') AS cliente_nome, p.cnpj_cpf AS cliente_documento FROM vendas v LEFT JOIN pessoas p ON v.cliente_id = p.id WHERE ${condicoes.join(' AND ')} ORDER BY v.criado_em DESC`, valores);
  return rows;
}
async function obterVendaPorId(id) {
  const vendaRes = await pool.query(`SELECT v.id, v.total, v.desconto, v.forma_pagamento, v.usuario, v.status, v.criado_em AS data, COALESCE(p.nome_fantasia, 'Cliente Avulso (Balcão)') AS cliente_nome, p.cnpj_cpf AS cliente_documento FROM vendas v LEFT JOIN pessoas p ON v.cliente_id = p.id WHERE v.id = $1`, [id]);
  if (!vendaRes.rows[0]) throw erro('Venda não encontrada.', 404);
  const itensRes = await pool.query('SELECT iv.id, iv.produto_id, p.nome AS produto_nome, p.sku, p.unidade_comercial, iv.quantidade, iv.valor_unitario, iv.subtotal FROM itens_venda iv JOIN produtos p ON p.id = iv.produto_id WHERE iv.venda_id = $1', [id]);
  return { ...vendaRes.rows[0], itens: itensRes.rows };
}
async function cancelarVenda(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vendaRes = await client.query('SELECT status FROM vendas WHERE id = $1 FOR UPDATE', [id]);
    if (!vendaRes.rows[0]) throw erro('Venda não encontrada.', 404);
    if (vendaRes.rows[0].status === 'CANCELADA') throw erro('Esta venda já foi cancelada previamente.');
    const itensRes = await client.query('SELECT produto_id, quantidade FROM itens_venda WHERE venda_id = $1', [id]);
    for (const item of itensRes.rows) await client.query('UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2', [item.quantidade, item.produto_id]);
    await client.query("UPDATE vendas SET status = 'CANCELADA' WHERE id = $1", [id]); await client.query('COMMIT');
    return { mensagem: 'Venda cancelada e estoque estornado com sucesso!' };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
module.exports = { processarVenda, listarVendas, obterVendaPorId, cancelarVenda };
