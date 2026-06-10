const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('[migrate] Esquema aplicado correctamente');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[migrate] Error aplicando esquema:', err.message);
  process.exit(1);
});
