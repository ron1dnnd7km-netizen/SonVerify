const { Pool } = require('pg');

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000
  });

  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    console.log('✅ Connected!');
    console.log('Server time:', result.rows[0].time);
    console.log('PostgreSQL version:', result.rows[0].version.substring(0, 50) + '...');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:');
    console.error('  Code:', err.code);
    console.error('  Message:', err.message);
    process.exit(1);
  }
}

testConnection();
