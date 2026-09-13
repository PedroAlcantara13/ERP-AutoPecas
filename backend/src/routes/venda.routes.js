// backend/src/routes/venda.routes.js
const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/venda.controller');

router.post('/', vendaController.criar);
router.get('/', vendaController.listar);
router.get('/:id', vendaController.obterPorId);
router.patch('/:id/confirmar-pagamento', vendaController.confirmarPagamento);
router.delete('/:id', vendaController.cancelar);

module.exports = router;
