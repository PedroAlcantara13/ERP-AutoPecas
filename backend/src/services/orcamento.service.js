const pool = require('../config/database');

const erro = (mensagem, status = 400) => Object.assign(new Error(mensagem), { status });

function normalizarItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) throw erro('O orçamento deve possuir ao menos um item.');
  return itens.map((item) => {
    const produto_id = Number(item.produto_id);
    const quantidade = Number(item.quantidade);
    const valor_unitario = Number(item.valor_unitario);
    const produto_nome = item.produto_nome ? String(item.produto_nome).trim() : null;

    if (!Number.isInteger(produto_id) || produto_id <= 0 || !Number.isFinite(quantidade) || quantidade <= 0 || !Number.isFinite(valor_unitario) || valor_unitario < 0) {
      throw erro('Os itens do orçamento possuem produto, quantidade ou preço inválido.');
    }
    return { produto_id, produto_nome, quantidade, valor_unitario, subtotal: quantidade * valor_unitario };
  });
}

function valoresOrcamento(dados = {}) {
  const itens = normalizarItens(dados.itens);
  const desconto = Number(dados.desconto || 0);
  if (!Number.isFinite(desconto) || desconto < 0) throw erro('Desconto inválido.');
  const subtotal = itens.reduce((acumulado, item) => acumulado + item.subtotal, 0);
  return { 
    itens, 
    desconto, 
    subtotal, 
    total: Math.max(0, subtotal - desconto), 
    cliente_id: dados.cliente_id ? Number(dados.cliente_id) : null,
    cliente_nome: dados.cliente_nome?.trim() || 'Cliente Avulso'
  };
}

async function validarClienteEProdutos(client, clienteId, itens, bloquearProdutos = false) {
  let nomeCliente = null;
  if (clienteId) {
    const cliente = await client.query('SELECT id, nome_fantasia FROM pessoas WHERE id = $1 AND cliente = true', [clienteId]);
    if (!cliente.rows[0]) throw erro('Cliente não encontrado ou não habilitado.', 404);
    nomeCliente = cliente.rows[0].nome_fantasia;
  }

  if (bloquearProdutos && Array.isArray(itens)) {
    for (const item of itens) {
      const prod = await client.query('SELECT id FROM produtos WHERE id = $1 FOR UPDATE', [item.produto_id]);
      if (!prod.rows[0]) throw erro(`Produto ID ${item.produto_id} não encontrado.`, 404);
    }
  }

  return nomeCliente;
}

async function inserirItens(client, orcamentoId, itens) {
  for (const item of itens) {
    await client.query(
      `INSERT INTO orcamento_itens (orcamento_id, produto_id, produto_nome, quantidade, valor_unitario, subtotal)
       VALUES (
         $1, 
         $2, 
         COALESCE($3, (SELECT nome FROM produtos WHERE id = $2), 'Produto sem nome'), 
         $4, 
         $5, 
         $6
       )`,
      [orcamentoId, item.produto_id, item.produto_nome, item.quantidade, item.valor_unitario, item.subtotal]
    );
  }
}

async function listarOrcamentos(filtros = {}) {
  const valores = [];
  const condicoes = ['1 = 1'];
  if (filtros.periodo === 'hoje') condicoes.push('o.criado_em >= CURRENT_DATE');
  else if (filtros.periodo === 'semana') condicoes.push("o.criado_em >= CURRENT_DATE - INTERVAL '7 days'");
  else if (filtros.periodo === 'mes') condicoes.push("o.criado_em >= CURRENT_DATE - INTERVAL '30 days'");

  if (filtros.busca?.trim()) {
    valores.push(`%${filtros.busca.trim()}%`);
    condicoes.push(`(p.nome_fantasia ILIKE $${valores.length} OR o.cliente_nome ILIKE $${valores.length} OR p.cnpj_cpf ILIKE $${valores.length} OR CAST(o.id AS TEXT) ILIKE $${valores.length})`);
  }
  if (filtros.status?.trim()) {
    valores.push(filtros.status.trim().toLowerCase());
    condicoes.push(`o.status = $${valores.length}`);
  }

  const { rows } = await pool.query(
    `SELECT o.id, o.cliente_id, o.desconto, o.total, o.status, o.criado_em, o.atualizado_em,
            COALESCE(p.nome_fantasia, o.cliente_nome, 'Cliente Avulso') AS cliente_nome, p.cnpj_cpf AS cliente_documento
     FROM orcamentos o 
     LEFT JOIN pessoas p ON p.id = o.cliente_id
     WHERE ${condicoes.join(' AND ')} 
     ORDER BY o.criado_em DESC`, 
    valores
  );
  return rows;
}

async function obterOrcamentoPorId(id) {
  const orcamento = await pool.query(
    `SELECT o.id, o.cliente_id, o.desconto, o.total, o.status, o.criado_em, o.atualizado_em,
            COALESCE(p.nome_fantasia, o.cliente_nome, 'Cliente Avulso') AS cliente_nome, p.cnpj_cpf AS cliente_documento
     FROM orcamentos o 
     LEFT JOIN pessoas p ON p.id = o.cliente_id 
     WHERE o.id = $1`, 
    [id]
  );
  if (!orcamento.rows[0]) throw erro('Orçamento não encontrado.', 404);

  const itens = await pool.query(
    `SELECT oi.id, oi.produto_id, COALESCE(oi.produto_nome, pr.nome, 'Produto sem nome') AS produto_nome, 
            oi.quantidade, oi.valor_unitario, oi.subtotal,
            pr.sku, pr.unidade_comercial, pr.estoque_atual
     FROM orcamento_itens oi 
     LEFT JOIN produtos pr ON pr.id = oi.produto_id
     WHERE oi.orcamento_id = $1 
     ORDER BY oi.id`, 
    [id]
  );
  return { ...orcamento.rows[0], itens: itens.rows };
}

async function criarOrcamento(dados) {
  const valores = valoresOrcamento(dados);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const nomeClienteBanco = await validarClienteEProdutos(client, valores.cliente_id, valores.itens);
    const nomeFinal = nomeClienteBanco || valores.cliente_nome;

    const resultado = await client.query(
      `INSERT INTO orcamentos (cliente_id, cliente_nome, desconto, total, status) VALUES ($1, $2, $3, $4, 'pendente') RETURNING *`,
      [valores.cliente_id, nomeFinal, valores.desconto, valores.total]
    );
    await inserirItens(client, resultado.rows[0].id, valores.itens);
    await client.query('COMMIT');
    return obterOrcamentoPorId(resultado.rows[0].id);
  } catch (error) { 
    await client.query('ROLLBACK'); 
    throw error; 
  } finally { 
    client.release(); 
  }
}

async function atualizarOrcamento(id, dados) {
  const valores = valoresOrcamento(dados);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const atual = await client.query('SELECT id, status FROM orcamentos WHERE id = $1 FOR UPDATE', [id]);
    if (!atual.rows[0]) throw erro('Orçamento não encontrado.', 404);
    if (atual.rows[0].status !== 'pendente') throw erro('Somente orçamentos pendentes podem ser alterados.');
    
    const nomeClienteBanco = await validarClienteEProdutos(client, valores.cliente_id, valores.itens);
    const nomeFinal = nomeClienteBanco || valores.cliente_nome;

    await client.query(
      'UPDATE orcamentos SET cliente_id = $1, cliente_nome = $2, desconto = $3, total = $4, atualizado_em = CURRENT_TIMESTAMP WHERE id = $5', 
      [valores.cliente_id, nomeFinal, valores.desconto, valores.total, id]
    );
    await client.query('DELETE FROM orcamento_itens WHERE orcamento_id = $1', [id]);
    await inserirItens(client, id, valores.itens);
    await client.query('COMMIT');
    return obterOrcamentoPorId(id);
  } catch (error) { 
    await client.query('ROLLBACK'); 
    throw error; 
  } finally { 
    client.release(); 
  }
}

async function cancelarOrcamento(id) {
  const { rows } = await pool.query(
    "UPDATE orcamentos SET status = 'cancelado', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pendente' RETURNING id", 
    [id]
  );
  if (!rows[0]) throw erro('Orçamento não encontrado ou não pode ser cancelado.', 404);
  return { mensagem: 'Orçamento cancelado com sucesso.' };
}

async function aprovarOrcamento(id, dados = {}) {
  const formaPagamentoBruta = String(dados.forma_pagamento || '').trim();
  if (!formaPagamentoBruta) throw erro('Informe a forma de pagamento para aprovar o orçamento.');

  const formaNormalizada = formaPagamentoBruta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const ehCrediario = formaNormalizada === 'crediario';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Busca e trava o orçamento
    const orcamento = await client.query('SELECT * FROM orcamentos WHERE id = $1 FOR UPDATE', [id]);
    if (!orcamento.rows[0]) throw erro('Orçamento não encontrado.', 404);
    if (orcamento.rows[0].status !== 'pendente') throw erro('Este orçamento já foi aprovado ou cancelado.');

    // 2. Busca os itens
    const itens = await client.query(
      'SELECT produto_id, quantidade, valor_unitario, subtotal FROM orcamento_itens WHERE orcamento_id = $1 ORDER BY produto_id', 
      [id]
    );
    await validarClienteEProdutos(client, orcamento.rows[0].cliente_id, itens.rows, true);

    const statusVenda = ehCrediario ? 'PENDENTE' : 'CONCLUIDA';
    const statusPagamento = ehCrediario ? 'pendente' : 'pago';
    const dataPagamento = statusPagamento === 'pago' ? new Date() : null;

    const venda = await client.query(
      `INSERT INTO vendas (
        cliente_id, 
        desconto, 
        forma_pagamento, 
        usuario, 
        total, 
        status, 
        status_pagamento, 
        data_pagamento
      )
      VALUES ($1, $2, $3::varchar, $4::varchar, $5, $6::varchar, $7::varchar, $8) 
      RETURNING id`,
      [
        orcamento.rows[0].cliente_id,
        orcamento.rows[0].desconto,
        ehCrediario ? 'crediario' : formaPagamentoBruta,
        dados.usuario?.trim() || 'Atendente Balcão',
        orcamento.rows[0].total,
        statusVenda,
        statusPagamento,
        dataPagamento
      ]
    );

    const vendaId = venda.rows[0].id;

    // 4. Insere itens da venda e atualiza o estoque
    for (const item of itens.rows) {
      await client.query(
        'INSERT INTO itens_venda (venda_id, produto_id, quantidade, valor_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)',
        [vendaId, item.produto_id, item.quantidade, item.valor_unitario, item.subtotal]
      );
      await client.query(
        'UPDATE produtos SET estoque_atual = COALESCE(estoque_atual, 0) - $1 WHERE id = $2',
        [item.quantidade, item.produto_id]
      );
    }

    // 5. Atualiza o status do orçamento usando SAVEPOINT para suportar schemas sem a coluna 'venda_id'
    try {
      await client.query('SAVEPOINT sp_atualizar_orcamento');
      await client.query(
        "UPDATE orcamentos SET status = 'aprovado', venda_id = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2", 
        [vendaId, id]
      );
      await client.query('RELEASE SAVEPOINT sp_atualizar_orcamento');
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT sp_atualizar_orcamento');
      await client.query(
        "UPDATE orcamentos SET status = 'aprovado', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1", 
        [id]
      );
    }

    await client.query('COMMIT');
    return { mensagem: 'Orçamento aprovado e convertido em venda com sucesso.', venda_id: vendaId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { 
  listarOrcamentos, 
  obterOrcamentoPorId, 
  criarOrcamento, 
  atualizarOrcamento, 
  cancelarOrcamento, 
  aprovarOrcamento 
};