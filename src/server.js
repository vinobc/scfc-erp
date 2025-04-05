const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth.routes");
const schoolRoutes = require("./routes/school.routes");
const semesterRoutes = require("./routes/semester.routes");
const programRoutes = require("./routes/program.routes");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Configure Helmet with custom CSP
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP
    crossOriginOpenerPolicy: false, // Disable COOP
    crossOriginEmbedderPolicy: false, // Disable COEP
    crossOriginResourcePolicy: false, // Disable CORP
    originAgentCluster: false, // Disable OAC
  })
);
// Security headers with CSP configured
app.use(cors()); // Enable CORS
app.use(morgan("dev")); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/schools", schoolRoutes);
console.log("Registering semesters routes at /api/semesters");
app.use("/api/semesters", semesterRoutes);
console.log("Registering programs routes at /api/programs");
app.use("/api/programs", programRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the SCFC ERP API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // For testing
