const pessoaService = require('../services/pessoa.service');

async function criar(req, res, next) { try { res.status(201).json(await pessoaService.criarPessoa(req.body)); } catch (erro) { next(erro); } }
async function listar(req, res, next) { try { res.json(await pessoaService.listarPessoas(req.query)); } catch (erro) { next(erro); } }
async function obterPorId(req, res, next) { try { res.json(await pessoaService.obterPessoaPorId(req.params.id)); } catch (erro) { next(erro); } }
async function atualizar(req, res, next) { try { res.json(await pessoaService.atualizarPessoa(req.params.id, req.body)); } catch (erro) { next(erro); } }
async function excluir(req, res, next) { try { res.json(await pessoaService.excluirPessoa(req.params.id)); } catch (erro) { next(erro); } }

module.exports = { criar, listar, obterPorId, atualizar, excluir };
