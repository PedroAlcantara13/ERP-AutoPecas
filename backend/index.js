require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./src/config/database');

const produtoRoutes = require('./src/routes/produto.routes');
const pessoaRoutes = require('./src/routes/pessoa.routes');
const vendaRoutes = require('./src/routes/venda.routes');
const orcamentoRoutes = require('./src/routes/orcamento.routes');

const app = express();

// 1. Liberação de CORS com suporte total a credenciais e múltiplos ambientes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Permite origens de localhost ou subdomínios Vercel
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Responde imediatamente a requisições Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Middleware nativo do Express para CORS (reforço de compatibilidade)
app.use(cors());
app.use(express.json());

// Endpoints da API
app.use('/api/produtos', produtoRoutes);
app.use('/api/pessoas', pessoaRoutes);
app.use('/api/vendas', vendaRoutes);
app.use('/api/orcamentos', orcamentoRoutes);

app.get('/', (req, res) => {
  res.json({ mensagem: 'API do ERP Autopeças rodando perfeitamente!' });
});

// 2. Handler Global de Erros (MANTÉM os cabeçalhos CORS em falhas 500)
app.use((error, req, res, next) => {
  console.error('❌ Erro no Servidor:', error);

  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(error.status || 500).json({
    mensagem: error.message || 'Erro interno do servidor.',
  });
});

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

module.exports = app;