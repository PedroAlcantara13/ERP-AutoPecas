const express = require('express');
const pessoaController = require('../controllers/pessoa.controller');

const router = express.Router();
router.get('/', pessoaController.listar);
router.post('/', pessoaController.criar);
router.get('/:id', pessoaController.obterPorId);
router.put('/:id', pessoaController.atualizar);
router.delete('/:id', pessoaController.excluir);

module.exports = router;
