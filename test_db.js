const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://studio_user:local_dev_password@10.0.10.57:8521/studio_dev"
});

async function testConnection() {
  try {
    await client.connect();
    console.log("SUCCESS: Connected to database");
    await client.end();
  } catch (err) {
    console.error("FAILURE: Could not connect to database");
    console.error(err);
    process.exit(1);
  }
}

testConnection();
