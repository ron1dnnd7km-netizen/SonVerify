require('dotenv').config();
var db = require('./db');

async function fix() {
  var cols = [
    'ALTER TABLE numbers ADD COLUMN IF NOT EXISTS service_icon VARCHAR(500)',
    'ALTER TABLE numbers ADD COLUMN IF NOT EXISTS country_code VARCHAR(10)',
    'ALTER TABLE numbers ADD COLUMN IF NOT EXISTS country_flag VARCHAR(10)',
    'ALTER TABLE numbers ADD COLUMN IF NOT EXISTS country_name VARCHAR(100)'
  ];
  
  for (var i = 0; i < cols.length; i++) {
    try {
      await db.prepare(cols[i]).run();
      console.log('✅ ' + cols[i]);
    } catch (e) {
      console.log('⚠️ ' + e.message);
    }
  }
  
  console.log('\n✅ Done! Now restart your server.');
  process.exit(0);
}

fix();