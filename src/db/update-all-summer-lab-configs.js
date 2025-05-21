// src/db/update-all-summer-lab-configs.js
const db = require("../config/db");
const {
  updateSummerLabSlotConfig,
} = require("./update-summer-lab-slot-config");

async function updateAllSummerLabConfigs() {
  try {
    console.log("Starting summer lab slot configuration updates...");

    // Run the update for summer lab slot linkages
    await updateSummerLabSlotConfig();

    console.log(
      "All summer lab slot configuration updates completed successfully"
    );
  } catch (error) {
    console.error("Error updating summer lab configurations:", error);
    throw error;
  }
}

// Run if this script is executed directly
if (require.main === module) {
  updateAllSummerLabConfigs()
    .then(() => {
      console.log("Summer lab configuration update process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Summer lab configuration update process failed:", error);
      process.exit(1);
    });
}
