const { Client } = require('pg');

async function createDatabase() {
  // First connect to the default 'postgres' database to create our database
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aayush100106',
    database: 'postgres' // Connect to default database first
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'voting_platform'"
    );

    if (result.rows.length === 0) {
      // Create the database
      await client.query('CREATE DATABASE voting_platform');
      console.log('✅ Database "voting_platform" created successfully!');
    } else {
      console.log('✅ Database "voting_platform" already exists!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === '28P01') {
      console.error('❌ Password authentication failed. Please check your password in .env file');
    }
  } finally {
    await client.end();
  }
}

createDatabase();