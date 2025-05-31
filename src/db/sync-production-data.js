// src/db/sync-production-data.js
const { Pool } = require("pg");
require("dotenv").config();

// Production database configuration
const productionPool = new Pool({
  host: process.env.PROD_DB_HOST || "35.200.229.112", // Correct production IP
  port: process.env.PROD_DB_PORT || 5432,
  user: process.env.PROD_DB_USER, // scfc_dba
  password: process.env.PROD_DB_PASSWORD, // scfcpassword
  database: process.env.DB_NAME, // Same database name
});

// Local database configuration
const localPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ALL Tables to sync in dependency order (base tables first, then dependent tables)
const SYNC_TABLES = [
  // Base tables with no dependencies
  {
    name: "allowed_slot_names",
    primaryKey: "name",
    dependencies: [],
  },
  {
    name: "allowed_slot_times",
    primaryKey: "time",
    dependencies: [],
  },
  {
    name: "school",
    primaryKey: "school_id",
    dependencies: [],
  },
  {
    name: "venue",
    primaryKey: "venue_id",
    dependencies: [],
  },
  {
    name: "semester",
    primaryKey: "semester_id",
    dependencies: [],
  },
  {
    name: "course",
    primaryKey: "course_code",
    dependencies: [],
  },

  // Tables that depend on school
  {
    name: "program",
    primaryKey: "program_id",
    dependencies: ["school"],
  },
  {
    name: "faculty",
    primaryKey: "faculty_id",
    dependencies: ["school"],
  },

  // Tables that depend on allowed values and other base tables
  {
    name: "slot",
    primaryKey: "slot_id",
    dependencies: ["allowed_slot_names", "allowed_slot_times"],
  },
  {
    name: "semester_slot_config",
    primaryKey: "config_id",
    dependencies: ["allowed_slot_names"],
  },
  {
    name: "slot_conflict",
    primaryKey: "conflict_id",
    dependencies: ["allowed_slot_names"],
  },

  // User table (depends on faculty via nullable employee_id)
  {
    name: "user",
    primaryKey: "user_id",
    dependencies: ["faculty"], // Nullable FK
  },

  // Tables that depend on user and other tables
  {
    name: "timetable_coordinators",
    primaryKey: "id",
    dependencies: ["user", "school"],
  },
  {
    name: "student",
    primaryKey: "enrollment_no",
    dependencies: ["program", "school", "user"],
  },

  // Tables with multiple dependencies (sync last)
  {
    name: "faculty_allocation",
    primaryKey: null, // Composite primary key
    dependencies: [
      "course",
      "faculty",
      "venue",
      "allowed_slot_names",
      "allowed_slot_times",
    ],
  },
];

async function testConnections() {
  console.log("🔗 Testing database connections...");
  console.log("Production Host:", process.env.PROD_DB_HOST || "35.200.229.112");
  console.log("Production User:", process.env.PROD_DB_USER);
  console.log("Local Host:", process.env.DB_HOST);
  console.log("Local User:", process.env.DB_USER);

  try {
    // Test production connection
    const prodResult = await productionPool.query(
      "SELECT version(), current_database()"
    );
    console.log(
      "✅ Production DB connected:",
      prodResult.rows[0].current_database
    );

    // Test local connection
    const localResult = await localPool.query(
      "SELECT version(), current_database()"
    );
    console.log("✅ Local DB connected:", localResult.rows[0].current_database);

    return true;
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    console.error("Error details:", {
      code: error.code,
      address: error.address,
      port: error.port,
    });
    return false;
  }
}

async function getTableRowCount(pool, tableName) {
  try {
    // Quote table names that might be reserved words
    const quotedTableName = tableName === "user" ? '"user"' : tableName;
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM ${quotedTableName}`
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.warn(`⚠️ Could not count rows in ${tableName}:`, error.message);
    return 0;
  }
}

async function getProductionTables() {
  try {
    const result = await productionPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    return result.rows.map((row) => row.table_name);
  } catch (error) {
    console.warn("⚠️ Could not fetch production table list:", error.message);
    return [];
  }
}

async function validateTableList() {
  console.log("🔍 Validating table list against production...");

  const prodTables = await getProductionTables();
  const syncTables = SYNC_TABLES.map((t) => t.name);

  const missingTables = prodTables.filter(
    (table) => !syncTables.includes(table)
  );
  const extraTables = syncTables.filter((table) => !prodTables.includes(table));

  if (missingTables.length > 0) {
    console.warn(
      "⚠️ Tables in production but not in sync list:",
      missingTables.join(", ")
    );
  }

  if (extraTables.length > 0) {
    console.warn(
      "⚠️ Tables in sync list but not in production:",
      extraTables.join(", ")
    );
  }

  if (missingTables.length === 0 && extraTables.length === 0) {
    console.log("✅ All production tables are included in sync list");
  }

  console.log(
    `📊 Production has ${prodTables.length} tables, sync list has ${syncTables.length} tables`
  );

  return { prodTables, missingTables, extraTables };
}

async function backupLocalData(tableName) {
  try {
    console.log(`📦 Backing up local ${tableName} data...`);

    // Quote table names that might be reserved words
    const quotedTableName = tableName === "user" ? '"user"' : tableName;
    const backupTableName = `${tableName}_backup_${Date.now()}`;

    // Create backup table
    await localPool.query(`DROP TABLE IF EXISTS ${backupTableName}`);
    await localPool.query(
      `CREATE TABLE ${backupTableName} AS SELECT * FROM ${quotedTableName}`
    );

    console.log(`✅ Backup created for ${tableName}`);
  } catch (error) {
    console.warn(`⚠️ Backup failed for ${tableName}:`, error.message);
  }
}

async function clearLocalTable(tableName) {
  try {
    console.log(`🗑️ Clearing local ${tableName} table...`);

    // Quote table names that might be reserved words
    const quotedTableName = tableName === "user" ? '"user"' : tableName;

    // For tables with foreign key constraints, use CASCADE
    // For base tables, use RESTART IDENTITY
    await localPool.query(
      `TRUNCATE ${quotedTableName} RESTART IDENTITY CASCADE`
    );

    console.log(`✅ Cleared ${tableName}`);
  } catch (error) {
    console.error(`❌ Failed to clear ${tableName}:`, error.message);

    // If truncate fails, try delete (slower but more reliable)
    try {
      console.log(`🔄 Trying DELETE instead of TRUNCATE for ${tableName}...`);
      const quotedTableName = tableName === "user" ? '"user"' : tableName;
      await localPool.query(`DELETE FROM ${quotedTableName}`);
      console.log(`✅ Cleared ${tableName} using DELETE`);
    } catch (deleteError) {
      console.error(
        `❌ DELETE also failed for ${tableName}:`,
        deleteError.message
      );
      throw deleteError;
    }
  }
}

async function syncTableData(tableName) {
  try {
    console.log(`\n🔄 Syncing ${tableName} data...`);

    // Quote table names that might be reserved words
    const quotedTableName = tableName === "user" ? '"user"' : tableName;

    // Get production data count
    const prodCount = await getTableRowCount(productionPool, tableName);
    console.log(`📊 Production ${tableName}: ${prodCount} records`);

    if (prodCount === 0) {
      console.log(`⚠️ No data to sync for ${tableName}`);
      return;
    }

    // Get local data count before sync
    const localCountBefore = await getTableRowCount(localPool, tableName);
    console.log(`📊 Local ${tableName} (before): ${localCountBefore} records`);

    // Backup local data
    if (localCountBefore > 0) {
      await backupLocalData(tableName);
    }

    // Clear local table
    await clearLocalTable(tableName);

    // Get all data from production
    console.log(`⬇️ Fetching data from production ${tableName}...`);
    const prodData = await productionPool.query(
      `SELECT * FROM ${quotedTableName} ORDER BY 1`
    );

    if (prodData.rows.length === 0) {
      console.log(`✅ ${tableName} sync completed (no data)`);
      return;
    }

    // Get column names
    const columns = Object.keys(prodData.rows[0]);
    const columnsList = columns.join(", ");
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");

    // Insert data in batches
    const BATCH_SIZE = 100;
    let inserted = 0;

    console.log(
      `⬆️ Inserting ${prodData.rows.length} records into local ${tableName}...`
    );

    for (let i = 0; i < prodData.rows.length; i += BATCH_SIZE) {
      const batch = prodData.rows.slice(i, i + BATCH_SIZE);

      // Begin transaction for this batch
      await localPool.query("BEGIN");

      try {
        for (const row of batch) {
          const values = columns.map((col) => row[col]);
          await localPool.query(
            `INSERT INTO ${quotedTableName} (${columnsList}) VALUES (${placeholders})`,
            values
          );
          inserted++;
        }

        await localPool.query("COMMIT");

        // Progress update
        const progress = Math.round((inserted / prodData.rows.length) * 100);
        console.log(
          `📈 Progress: ${inserted}/${prodData.rows.length} (${progress}%)`
        );
      } catch (error) {
        await localPool.query("ROLLBACK");
        console.error(
          `❌ Batch insert failed for ${tableName}:`,
          error.message
        );
        throw error;
      }
    }

    // Verify sync
    const localCountAfter = await getTableRowCount(localPool, tableName);
    console.log(`📊 Local ${tableName} (after): ${localCountAfter} records`);

    if (localCountAfter === prodCount) {
      console.log(`✅ ${tableName} sync completed successfully`);
    } else {
      console.warn(
        `⚠️ ${tableName} sync count mismatch: expected ${prodCount}, got ${localCountAfter}`
      );
    }
  } catch (error) {
    console.error(`❌ Failed to sync ${tableName}:`, error.message);
    throw error;
  }
}

async function updateSequences() {
  console.log("\n🔢 Updating auto-increment sequences...");

  try {
    // Get all sequences and update them
    const sequences = await localPool.query(`
      SELECT schemaname, sequencename 
      FROM pg_sequences 
      WHERE schemaname = 'public'
    `);

    for (const seq of sequences.rows) {
      // Get the associated table and column
      const tableResult = await localPool.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE column_default LIKE '%${seq.sequencename}%'
      `);

      if (tableResult.rows.length > 0) {
        const tableName = tableResult.rows[0].table_name;
        const columnName = tableResult.rows[0].column_name;
        const quotedTableName = tableName === "user" ? '"user"' : tableName;

        // Update sequence to max value
        await localPool.query(`
          SELECT setval('${seq.sequencename}', 
            COALESCE((SELECT MAX(${columnName}) FROM ${quotedTableName}), 1), 
            true)
        `);

        console.log(`✅ Updated sequence: ${seq.sequencename}`);
      }
    }
  } catch (error) {
    console.warn(
      "⚠️ Some sequences may not be updated correctly:",
      error.message
    );
  }
}

async function validateSync() {
  console.log("\n🔍 Validating sync results...");

  const summary = [];

  for (const table of SYNC_TABLES) {
    try {
      const prodCount = await getTableRowCount(productionPool, table.name);
      const localCount = await getTableRowCount(localPool, table.name);

      summary.push({
        table: table.name,
        production: prodCount,
        local: localCount,
        synced: prodCount === localCount,
      });
    } catch (error) {
      summary.push({
        table: table.name,
        production: "Error",
        local: "Error",
        synced: false,
      });
    }
  }

  console.log("\n📋 SYNC SUMMARY:");
  console.log("═".repeat(60));
  console.log(
    "Table Name".padEnd(20) +
      "Production".padEnd(12) +
      "Local".padEnd(12) +
      "Status"
  );
  console.log("─".repeat(60));

  summary.forEach((item) => {
    const status = item.synced ? "✅ OK" : "❌ MISMATCH";
    console.log(
      item.table.padEnd(20) +
        String(item.production).padEnd(12) +
        String(item.local).padEnd(12) +
        status
    );
  });

  console.log("═".repeat(60));

  const allSynced = summary.every((item) => item.synced);
  if (allSynced) {
    console.log("🎉 All tables synced successfully!");
  } else {
    console.log(
      "⚠️ Some tables have sync issues. Please check the details above."
    );
  }

  return allSynced;
}

async function confirmSync() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log(
      "\n⚠️ WARNING: This will REPLACE ALL local data with production data!"
    );
    console.log(
      "Backups will be created, but this action cannot be easily undone."
    );
    rl.question("\nDo you want to continue? (yes/no): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

async function main() {
  console.log("🚀 Starting database sync process...");
  console.log(
    "Strategy: Complete replacement of local data with production data"
  );
  console.log(
    `📋 Target tables (${SYNC_TABLES.length} total):`,
    SYNC_TABLES.map((t) => t.name).join(", ")
  );
  console.log(
    "🔄 Sync order: Base tables → Dependent tables → Complex dependent tables"
  );

  try {
    // Test connections
    const connectionsOk = await testConnections();
    if (!connectionsOk) {
      throw new Error("Database connections failed");
    }

    // Validate that we're syncing all available tables
    await validateTableList();

    // Confirm before proceeding
    const shouldContinue = await confirmSync();
    if (!shouldContinue) {
      console.log("❌ Sync cancelled by user");
      return;
    }

    // Sync each table in dependency order
    for (const table of SYNC_TABLES) {
      await syncTableData(table.name);
    }

    // Update sequences
    await updateSequences();

    // Validate results
    const syncSuccess = await validateSync();

    if (syncSuccess) {
      console.log("\n🎉 Database sync completed successfully!");
      console.log("Your local database now has all production data.");
    } else {
      console.log(
        "\n⚠️ Sync completed with some issues. Please review the summary above."
      );
    }
  } catch (error) {
    console.error("\n❌ Sync process failed:", error.message);
    console.error("Please check the error details and try again.");
  } finally {
    // Close connections
    await productionPool.end();
    await localPool.end();
    console.log("\n🔌 Database connections closed.");
  }
}

// Export for use in other scripts
module.exports = {
  syncTableData,
  testConnections,
  validateSync,
  main,
};

// Run if this script is executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
