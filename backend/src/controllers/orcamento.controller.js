const service = require('../services/orcamento.service');

async function listar(req, res, next) { try { res.json(await service.listarOrcamentos(req.query)); } catch (erro) { next(erro); } }
async function obter(req, res, next) { try { res.json(await service.obterOrcamentoPorId(req.params.id)); } catch (erro) { next(erro); } }
async function criar(req, res, next) { try { res.status(201).json(await service.criarOrcamento(req.body)); } catch (erro) { next(erro); } }
async function atualizar(req, res, next) { try { res.json(await service.atualizarOrcamento(req.params.id, req.body)); } catch (erro) { next(erro); } }
async function cancelar(req, res, next) { try { res.json(await service.cancelarOrcamento(req.params.id)); } catch (erro) { next(erro); } }
async function aprovar(req, res, next) { try { res.json(await service.aprovarOrcamento(req.params.id, req.body)); } catch (erro) { next(erro); } }

module.exports = { listar, obter, criar, atualizar, cancelar, aprovar };
