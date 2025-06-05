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
const venueRoutes = require("./routes/venue.routes");
const facultyRoutes = require("./routes/faculty.routes");
const courseRoutes = require("./routes/course.routes");
const studentRoutes = require("./routes/student.routes");
const slotRoutes = require("./routes/slot.routes");
const facultyAllocationRoutes = require("./routes/faculty-allocation.routes");
const semesterSlotConfigRoutes = require("./routes/semester-slot-config.routes");
const timetableCoordinatorRoutes = require("./routes/timetable-coordinator.routes");
const userRoutes = require("./routes/user.routes");
const studentAuthRoutes = require("./routes/student-auth.routes");
const systemConfigRoutes = require("./routes/system-config.routes");

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
app.use("/api/student-auth", studentAuthRoutes);
app.use("/api/schools", schoolRoutes);
console.log("Registering semesters routes at /api/semesters");
app.use("/api/semesters", semesterRoutes);
console.log("Registering programs routes at /api/programs");
app.use("/api/programs", programRoutes);
console.log("Registering venues routes at /api/venues");
app.use("/api/venues", venueRoutes);
console.log("Registering faculty routes at /api/faculty");
app.use("/api/faculty", facultyRoutes);
console.log("Registering course routes at /api/courses");
app.use("/api/courses", courseRoutes);
console.log("Registering student routes at /api/students");
app.use("/api/students", studentRoutes);
console.log("Registering slot routes at /api/slots");
app.use("/api/slots", slotRoutes);
console.log(
  "Registering faculty allocation routes at /api/faculty-allocations"
);
app.use("/api/faculty-allocations", facultyAllocationRoutes);
console.log(
  "Registering semester slot config routes at /api/semester-slot-configs"
);
app.use("/api/semester-slot-configs", semesterSlotConfigRoutes);
console.log("Registering slot conflict routes at /api/slot-conflicts");
app.use("/api/slot-conflicts", require("./routes/slot-conflict.routes"));
console.log(
  "Registering timetable coordinator routes at /api/timetable-coordinators"
);
app.use("/api/timetable-coordinators", timetableCoordinatorRoutes);
console.log("Registering user routes at /api/users");
app.use("/api/users", userRoutes);
// Course Registration Routes
app.use(
  "/api/course-registration",
  require("./routes/course-registration.routes")
);
app.use("/api/system-config", systemConfigRoutes);

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
