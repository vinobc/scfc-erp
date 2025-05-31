// src/db/check-env.js
require("dotenv").config();

console.log("🔍 Environment Variables Check:");
console.log("================================");
console.log("PROD_DB_HOST:", process.env.PROD_DB_HOST);
console.log("PROD_DB_USER:", process.env.PROD_DB_USER);
console.log(
  "PROD_DB_PASSWORD:",
  process.env.PROD_DB_PASSWORD ? "***" : "NOT SET"
);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_HOST (local):", process.env.DB_HOST);
console.log("DB_USER (local):", process.env.DB_USER);
console.log("================================");

if (!process.env.PROD_DB_HOST) {
  console.log("❌ PROD_DB_HOST is not set!");
  console.log("Add this line to your .env file:");
  console.log("PROD_DB_HOST=35.200.229.112");
} else if (process.env.PROD_DB_HOST === "35.200.229.112") {
  console.log("✅ PROD_DB_HOST is correctly set");
} else {
  console.log(
    "⚠️ PROD_DB_HOST is set but might be wrong:",
    process.env.PROD_DB_HOST
  );
}
