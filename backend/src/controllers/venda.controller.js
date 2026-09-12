// backend/src/controllers/venda.controller.js
const vendaService = require('../services/venda.service');

async function criar(req, res, next) {
  try {
    const resultado = await vendaService.processarVenda(req.body);
    return res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const vendas = await vendaService.listarVendas(req.query);
    return res.json(vendas);
  } catch (err) {
    next(err);
  }
}

async function obterPorId(req, res, next) {
  try {
    const venda = await vendaService.obterVendaPorId(req.params.id);
    return res.json(venda);
  } catch (err) {
    next(err);
  }
}

async function cancelar(req, res, next) {
  try {
    const resultado = await vendaService.cancelarVenda(req.params.id);
    return res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { criar, listar, obterPorId, cancelar };