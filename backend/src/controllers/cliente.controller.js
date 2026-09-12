const clienteService = require('../services/cliente.service');

async function cadastrar(req, res) {
  try {
    const novoCliente = await clienteService.criarCliente(req.body);
    return res.status(201).json(novoCliente);
  } catch (error) {
    const statusCode = error.status || 500;
    return res.status(statusCode).json({ mensagem: error.message });
  }
}

async function listar(req, res) {
  try {
    const clientes = await clienteService.listarClientes();
    return res.status(200).json(clientes);
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao buscar clientes.', erro: error.message });
  }
}

module.exports = { cadastrar, listar };