const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');

router.post('/', clienteController.cadastrar);
router.get('/', clienteController.listar);

module.exports = router;