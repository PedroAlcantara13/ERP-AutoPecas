const service = require('../services/orcamento.service');

function validarId(idStr) {
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    const erro = new Error('Identificador (ID) inválido informado.');
    erro.status = 400;
    throw erro;
  }
  return id;
}

async function listar(req, res, next) {
  try {
    const orcamentos = await service.listarOrcamentos(req.query);
    return res.json(orcamentos);
  } catch (erro) {
    next(erro);
  }
}

async function obter(req, res, next) {
  try {
    const id = validarId(req.params.id);
    const orcamento = await service.obterOrcamentoPorId(id);
    return res.json(orcamento);
  } catch (erro) {
    next(erro);
  }
}

async function criar(req, res, next) {
  try {
    const novoOrcamento = await service.criarOrcamento(req.body);
    return res.status(201).json(novoOrcamento);
  } catch (erro) {
    next(erro);
  }
}

async function atualizar(req, res, next) {
  try {
    const id = validarId(req.params.id);
    const orcamentoAtualizado = await service.atualizarOrcamento(id, req.body);
    return res.json(orcamentoAtualizado);
  } catch (erro) {
    next(erro);
  }
}

async function cancelar(req, res, next) {
  try {
    const id = validarId(req.params.id);
    const resultado = await service.cancelarOrcamento(id);
    return res.json(resultado);
  } catch (erro) {
    next(erro);
  }
}

async function aprovar(req, res, next) {
  try {
    const id = validarId(req.params.id);
    
    // Tratamento para garantir que req.body seja um objeto válido
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    
    // Se a forma de pagamento vier diretamente como string no corpo
    const formaPagamento = body.forma_pagamento || (typeof req.body === 'string' ? req.body : undefined);

    const dadosAprovacao = {
      ...body,
      forma_pagamento: formaPagamento,
      usuario: body.usuario || req.user?.nome || req.usuario?.nome || 'Atendente Balcão'
    };

    const resultado = await service.aprovarOrcamento(id, dadosAprovacao);
    return res.json(resultado);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  listar,
  obter,
  criar,
  atualizar,
  cancelar,
  aprovar,
};