
const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Add GALLON to unit_type enum
    await client.query("ALTER TYPE unit_type ADD VALUE 'GALLON';");
    console.log('Successfully added GALLON to unit_type enum');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('GALLON already exists in unit_type enum');
    } else {
      console.error('Migration failed:', error);
    }
  } finally {
    await client.end();
  }
}

runMigration();
