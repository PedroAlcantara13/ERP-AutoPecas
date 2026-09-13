require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./src/config/database');

const produtoRoutes = require('./src/routes/produto.routes');
const pessoaRoutes = require('./src/routes/pessoa.routes');
const vendaRoutes = require('./src/routes/venda.routes');
const orcamentoRoutes = require('./src/routes/orcamento.routes');

const app = express();

const allowedOrigins = [
  'https://erp-auto-pecas.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (mobile, Postman, curl ou mesmo servidor)
    if (!origin) return callback(null, true);

    // Valida se está na lista explicitada ou se é subdomínio de preview da Vercel
    const isAllowed = allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      // Retorna false em vez de disparar Error para evitar que quebre sem enviar os headers CORS
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Trata explicitamente requisições preflight (OPTIONS)
app.options('*', cors());

app.use(express.json());

// Endpoints da API
app.use('/api/produtos', produtoRoutes);
app.use('/api/pessoas', pessoaRoutes);
app.use('/api/vendas', vendaRoutes);
app.use('/api/orcamentos', orcamentoRoutes);

app.get('/', (req, res) => {
  res.json({ mensagem: 'API do ERP Autopeças rodando perfeitamente!' });
});

// Middleware Global de Tratamento de Erros
app.use((error, req, res, next) => {
  console.error('Erro na aplicação:', error);
  res.status(error.status || 500).json({ 
    mensagem: error.message || 'Erro interno do servidor.' 
  });
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

module.exports = app;