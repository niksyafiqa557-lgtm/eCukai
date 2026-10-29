const { neon } = require('@neondatabase/serverless');

let connection;

function getDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  connection ||= neon(process.env.DATABASE_URL);
  return connection;
}

module.exports = { getDatabase };
