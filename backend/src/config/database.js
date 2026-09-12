// backend/src/config/database.js
const { Pool } = require('pg');

// Verifica se existe uma string de conexão completa (Neon / Supabase / Render) ou usa os campos individuais
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Necessário para conexões seguras no Neon e Supabase
      },
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: String(process.env.DB_PASSWORD || ''),
      port: Number(process.env.DB_PORT) || 5432,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL com sucesso!');
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no cliente do PostgreSQL:', err.message);
});

module.exports = pool;