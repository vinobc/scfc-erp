// src/db/test-production-connection.js
const { Pool } = require("pg");
require("dotenv").config();

async function testProductionConnection() {
  console.log("🔗 Testing production database connection...");
  console.log("Host:", process.env.PROD_DB_HOST || "35.200.229.112");
  console.log("Port:", process.env.PROD_DB_PORT || 5432);
  console.log("User:", process.env.PROD_DB_USER);
  console.log("Database:", process.env.DB_NAME);

  const connectionConfig = {
    host: process.env.PROD_DB_HOST || "35.200.229.112",
    port: process.env.PROD_DB_PORT || 5432,
    user: process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASSWORD,
    database: process.env.DB_NAME,
    // Add connection timeout settings
    connectionTimeoutMillis: 10000, // 10 seconds
    idleTimeoutMillis: 30000,
    // Try different SSL modes
    ssl: false, // Start with no SSL
  };

  console.log("Connection config (without password):", {
    ...connectionConfig,
    password: "***",
  });

  const pool = new Pool(connectionConfig);

  try {
    console.log("⏳ Attempting connection...");
    const client = await pool.connect();

    console.log("✅ Connected! Testing query...");
    const result = await client.query(
      "SELECT version(), current_database(), now()"
    );
    console.log("📊 Database info:");
    console.log("- Database:", result.rows[0].current_database);
    console.log("- Time:", result.rows[0].now);
    console.log("- Version:", result.rows[0].version.substring(0, 50) + "...");

    client.release();
    console.log("✅ Connection test successful!");

    // Test table access
    console.log("\n🔍 Testing table access...");
    const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
      LIMIT 5
    `);

    console.log(
      "📋 Sample tables:",
      tableResult.rows.map((r) => r.table_name).join(", ")
    );
    console.log("✅ Table access successful!");
  } catch (error) {
    console.error("❌ Connection failed:");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);

    if (error.code === "ETIMEDOUT") {
      console.log("\n🔧 Troubleshooting ETIMEDOUT:");
      console.log("1. Check if the IP address is correct");
      console.log("2. Verify firewall/security group allows your IP");
      console.log("3. Confirm PostgreSQL allows external connections");
      console.log("4. Check if you need a VPN or SSH tunnel");
    } else if (error.code === "ENOTFOUND") {
      console.log("\n🔧 Troubleshooting ENOTFOUND:");
      console.log("1. Check if the hostname/IP is correct");
      console.log("2. Verify DNS resolution");
    } else if (error.code === "28P01") {
      console.log("\n🔧 Troubleshooting Authentication:");
      console.log("1. Check username and password");
      console.log("2. Verify user has remote access permissions");
    }
  } finally {
    await pool.end();
  }
}

// Run the test
testProductionConnection()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
