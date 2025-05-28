
import postgres from 'postgres';

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/shopping_app";
  
  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    console.log('Connected to database');
    
    // Add GALLON to unit_type enum
    await client`ALTER TYPE unit_type ADD VALUE 'GALLON';`;
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
