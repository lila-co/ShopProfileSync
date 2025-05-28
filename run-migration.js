
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
    
    // Get current enum values from the database
    const currentEnumValues = await client`
      SELECT enumlabel as value 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'unit_type'
      )
    `;
    
    const existingValues = new Set(currentEnumValues.map(row => row.value));
    console.log('Current enum values:', Array.from(existingValues));
    
    // Define all possible unit types that the application might use
    const allPossibleUnits = [
      'COUNT', 'LB', 'OZ', 'G', 'KG', 'PKG', 'ROLL', 'BOX', 'CAN', 
      'BOTTLE', 'JAR', 'BUNCH', 'GALLON', 'LOAF', 'DOZEN', 'PINT', 
      'QUART', 'CUP', 'TSP', 'TBSP', 'ML', 'L', 'SLICE', 'PACK',
      'BAG', 'CONTAINER', 'PIECE', 'UNIT', 'SERVING'
    ];
    
    // Find missing values
    const missingValues = allPossibleUnits.filter(unit => !existingValues.has(unit));
    
    if (missingValues.length === 0) {
      console.log('All unit types are already present in the database');
      return;
    }
    
    console.log('Missing enum values:', missingValues);
    
    // Add each missing value
    for (const unit of missingValues) {
      try {
        await client.unsafe(`ALTER TYPE unit_type ADD VALUE '${unit}';`);
        console.log(`✓ Successfully added ${unit} to unit_type enum`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ ${unit} already exists in unit_type enum`);
        } else {
          console.error(`✗ Error adding ${unit}:`, error.message);
        }
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
