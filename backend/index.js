require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./src/config/database');

const produtoRoutes = require('./src/routes/produto.routes');
const pessoaRoutes = require('./src/routes/pessoa.routes');
const vendaRoutes = require('./src/routes/venda.routes');
const orcamentoRoutes = require('./src/routes/orcamento.routes');

const app = express();

// Configuração de CORS para liberar o frontend na Vercel
const allowedOrigins = [
  'https://erp-auto-pecas.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Endpoints da API
app.use('/api/produtos', produtoRoutes);
app.use('/api/pessoas', pessoaRoutes);
app.use('/api/vendas', vendaRoutes);
app.use('/api/orcamentos', orcamentoRoutes);

app.get('/', (req, res) => {
  res.json({ mensagem: 'API do ERP Autopeças rodando perfeitamente!' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({ mensagem: error.message || 'Erro interno do servidor.' });
});

// Executa app.listen APENAS em desenvolvimento local
if (!process.env.VERCEL) {
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
}

// Exporta o app do Express para a Vercel transformar em Serverless Function
module.exports = app;
