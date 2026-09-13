const express = require('express');
const controller = require('../controllers/orcamento.controller');

const router = express.Router();
router.get('/', controller.listar);
router.post('/', controller.criar);
router.get('/:id', controller.obter);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.cancelar);
router.post('/:id/aprovar', controller.aprovar);

module.exports = router;
