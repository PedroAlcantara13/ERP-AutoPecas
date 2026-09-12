require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./src/config/database');

const produtoRoutes = require('./src/routes/produto.routes');
const clienteRoutes = require('./src/routes/cliente.routes');
const vendaRoutes = require('./src/routes/venda.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Endpoints da API
app.use('/api/produtos', produtoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/vendas', vendaRoutes);

app.get('/', (req, res) => {
  res.json({ mensagem: 'API do ERP Autopeças rodando perfeitamente!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Banco de dados conectado com sucesso!');
  } catch (error) {
    console.error('❌ Erro na conexão com o banco:', error.message);
  }
});