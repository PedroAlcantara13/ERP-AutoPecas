// backend/src/routes/produto.routes.js
const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produto.controller');

router.get('/', produtoController.listar);
router.post('/', produtoController.cadastrar);
router.get('/:id', produtoController.obterPorId);
router.put('/:id', produtoController.atualizar);
router.post('/:id/estoque', produtoController.adicionarEstoque);
router.delete('/:id', produtoController.inativar);

module.exports = router;
