// backend/src/controllers/produto.controller.js
const produtoService = require('../services/produto.service');

async function listar(req, res, next) {
  try {
    const produtos = await produtoService.listarProdutos(req.query);
    return res.json(produtos);
  } catch (err) {
    next(err);
  }
}

async function cadastrar(req, res, next) {
  try {
    const produto = await produtoService.cadastrarProduto(req.body);
    return res.status(201).json(produto);
  } catch (err) {
    next(err);
  }
}

async function obterPorId(req, res, next) {
  try {
    const produto = await produtoService.obterProdutoPorId(req.params.id);
    return res.json(produto);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const produto = await produtoService.atualizarProduto(req.params.id, req.body);
    return res.json(produto);
  } catch (err) {
    next(err);
  }
}

async function adicionarEstoque(req, res, next) {
  try {
    const produto = await produtoService.adicionarEstoque(req.params.id, req.body.quantidade);
    return res.json(produto);
  } catch (err) {
    next(err);
  }
}

async function inativar(req, res, next) {
  try {
    const resultado = await produtoService.inativarProduto(req.params.id);
    return res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  cadastrar,
  obterPorId,
  atualizar,
  adicionarEstoque,
  inativar
};
