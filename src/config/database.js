const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Sequelize } = require('sequelize');

function criarConexao() {
  if (process.env.DATABASE_URL) {
    const host = new URL(process.env.DATABASE_URL).hostname.toLowerCase();
    const ssl = { rejectUnauthorized: true };

    if (host.endsWith('.pooler.supabase.com') || host.endsWith('.supabase.co')) {
      ssl.ca = readFileSync(join(__dirname, 'supabase-ca.pem'), 'utf8');
    }

    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: { ssl },
      pool: { max: 2, min: 0, acquire: 10000, idle: 5000 },
      logging: false,
    });
  }

  if (process.env.VERCEL || !process.env.DB_NAME) {
    return null;
  }

  return new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
  });
}

module.exports = criarConexao();
