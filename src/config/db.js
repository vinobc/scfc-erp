const { Pool } = require("pg");
require("dotenv").config();

// Log database connection info (without showing the password)
console.log("Database connection settings:");
console.log("Host:", process.env.DB_HOST);
console.log("Port:", process.env.DB_PORT);
console.log("User:", process.env.DB_USER);
console.log("Database:", process.env.DB_NAME);
console.log("Environment:", process.env.NODE_ENV);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Optimized connection limits for 1000+ students
  max: 80, // Maximum 80 connections (4x previous capacity)
  idleTimeoutMillis: 10000, // Close idle connections after 10 seconds (faster recycling)
  connectionTimeoutMillis: 2000, // 2 second timeout for new connections
});

pool.on("connect", () => {
  console.log(
    `Connected to database: ${process.env.DB_NAME} on ${process.env.DB_HOST}`
  );
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Run a query to test connection and log server version
(async () => {
  try {
    const result = await pool.query("SELECT version()");
    console.log("Database server version:", result.rows[0].version);
  } catch (err) {
    console.error("Error checking database version:", err);
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
