// backend/src/services/cliente.service.js
const pool = require('../config/database');

async function criarCliente(dados) {
  const client = await pool.connect();
  try {
    const { nome, cpf_cnpj, telefone, email } = dados;

    const result = await client.query(
      `INSERT INTO clientes (nome, cpf_cnpj, telefone, email)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nome, cpf_cnpj || null, telefone || null, email || null]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      const err = new Error('Já existe um cliente cadastrado com este CPF/CNPJ.');
      err.status = 400;
      throw err;
    }
    throw error;
  } finally {
    client.release();
  }
}

async function listarClientes() {
  const query = `SELECT * FROM clientes ORDER BY nome ASC;`;
  const result = await pool.query(query);
  return result.rows;
}

module.exports = { criarCliente, listarClientes };