// backend/src/services/venda.service.js
const pool = require('../config/database');

async function garantirColunaStatus() {
  await pool.query(`ALTER TABLE vendas ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'CONCLUIDA'`);
}

async function processarVenda(dados) {
  await garantirColunaStatus();
  const client = await pool.connect();
  try {
    const { cliente_id, itens, desconto, forma_pagamento, usuario } = dados;

    if (!itens || itens.length === 0) {
      const err = new Error('A venda deve conter ao menos um item.');
      err.status = 400;
      throw err;
    }

    await client.query('BEGIN');

    let subtotalGeral = 0;

    for (const item of itens) {
      const prodRes = await client.query(
        'SELECT id, nome, estoque_atual, valor_venda FROM produtos WHERE id = $1 FOR UPDATE',
        [item.produto_id]
      );

      if (prodRes.rows.length === 0) {
        const err = new Error(`Produto código ${item.produto_id} não foi encontrado.`);
        err.status = 404;
        throw err;
      }

      const produto = prodRes.rows[0];

      if (Number(produto.estoque_atual) < Number(item.quantidade)) {
        const err = new Error(`Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque_atual}`);
        err.status = 400;
        throw err;
      }

      subtotalGeral += Number(produto.valor_venda) * Number(item.quantidade);
    }

    const valorDesconto = Number(desconto) || 0;
    const totalGeral = Math.max(0, subtotalGeral - valorDesconto);

    const vendaRes = await client.query(
      `INSERT INTO vendas (cliente_id, desconto, forma_pagamento, usuario, total, status)
       VALUES ($1, $2, $3, $4, $5, 'CONCLUIDA') RETURNING id, criado_em`,
      [cliente_id || null, valorDesconto, forma_pagamento, usuario || 'Atendente Balcão', totalGeral]
    );

    const vendaId = vendaRes.rows[0].id;

    for (const item of itens) {
      const prodRes = await client.query('SELECT estoque_atual, valor_venda FROM produtos WHERE id = $1', [item.produto_id]);
      const estoqueAnterior = Number(prodRes.rows[0].estoque_atual);
      const valorUnitario = Number(prodRes.rows[0].valor_venda);
      const subtotalItem = valorUnitario * Number(item.quantidade);
      const estoqueFinal = estoqueAnterior - Number(item.quantidade);

      await client.query(
        `INSERT INTO itens_venda (venda_id, produto_id, quantidade, valor_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [vendaId, item.produto_id, item.quantidade, valorUnitario, subtotalItem]
      );

      await client.query('UPDATE produtos SET estoque_atual = $1 WHERE id = $2', [estoqueFinal, item.produto_id]);
    }

    await client.query('COMMIT');

    return {
      venda_id: vendaId,
      subtotal: subtotalGeral,
      desconto: valorDesconto,
      total: totalGeral,
      data: vendaRes.rows[0].criado_em
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listarVendas(filtros = {}) {
  await garantirColunaStatus();

  const { periodo, busca } = filtros;
  let sql = `
    SELECT 
      v.id,
      v.total,
      v.desconto,
      v.forma_pagamento,
      v.usuario,
      COALESCE(v.status, 'CONCLUIDA') AS status,
      v.criado_em AS data,
      COALESCE(c.nome, 'Cliente Avulso (Balcão)') AS cliente_nome,
      c.cpf_cnpj AS cliente_documento
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (periodo === 'hoje') {
    sql += ` AND v.criado_em >= CURRENT_DATE`;
  } else if (periodo === 'semana') {
    sql += ` AND v.criado_em >= CURRENT_DATE - INTERVAL '7 days'`;
  } else if (periodo === 'mes') {
    sql += ` AND v.criado_em >= CURRENT_DATE - INTERVAL '30 days'`;
  }

  if (busca && busca.trim()) {
    params.push(`%${busca.trim().toLowerCase()}%`);
    const idx = params.length;
    sql += ` AND (LOWER(c.nome) LIKE $${idx} OR CAST(v.id AS TEXT) LIKE $${idx})`;
  }

  sql += ` ORDER BY v.criado_em DESC`;

  const { rows } = await pool.query(sql, params);
  return rows;
}

async function obterVendaPorId(id) {
  await garantirColunaStatus();

  const vendaRes = await pool.query(
    `SELECT 
      v.id,
      v.total,
      v.desconto,
      v.forma_pagamento,
      v.usuario,
      COALESCE(v.status, 'CONCLUIDA') AS status,
      v.criado_em AS data,
      COALESCE(c.nome, 'Cliente Avulso (Balcão)') AS cliente_nome,
      c.cpf_cnpj AS cliente_documento
     FROM vendas v
     LEFT JOIN clientes c ON v.cliente_id = c.id
     WHERE v.id = $1`,
    [id]
  );

  if (vendaRes.rows.length === 0) {
    const err = new Error('Venda não encontrada.');
    err.status = 404;
    throw err;
  }

  const itensRes = await pool.query(
    `SELECT 
      iv.id,
      iv.produto_id,
      p.nome AS produto_nome,
      p.sku,
      p.unidade_medida,
      iv.quantidade,
      iv.valor_unitario,
      iv.subtotal
     FROM itens_venda iv
     JOIN produtos p ON iv.produto_id = p.id
     WHERE iv.venda_id = $1`,
    [id]
  );

  return {
    ...vendaRes.rows[0],
    itens: itensRes.rows
  };
}

async function cancelarVenda(id) {
  await garantirColunaStatus();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const vendaRes = await client.query('SELECT status FROM vendas WHERE id = $1 FOR UPDATE', [id]);
    if (vendaRes.rows.length === 0) {
      const err = new Error('Venda não encontrada.');
      err.status = 404;
      throw err;
    }

    if (vendaRes.rows[0].status === 'CANCELADA') {
      const err = new Error('Esta venda já foi cancelada previamente.');
      err.status = 400;
      throw err;
    }

    const itensRes = await client.query('SELECT produto_id, quantidade FROM itens_venda WHERE venda_id = $1', [id]);
    for (const item of itensRes.rows) {
      await client.query(
        'UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2',
        [item.quantidade, item.produto_id]
      );
    }

    await client.query("UPDATE vendas SET status = 'CANCELADA' WHERE id = $1", [id]);

    await client.query('COMMIT');
    return { mensagem: 'Venda cancelada e estoque estornado com sucesso!' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  processarVenda,
  listarVendas,
  obterVendaPorId,
  cancelarVenda
};