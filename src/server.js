const express = require("express");
const compression = require("compression");
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
const staffRoutes = require("./routes/staff.routes");
const courseRoutes = require("./routes/course.routes");
const studentRoutes = require("./routes/student.routes");
const slotRoutes = require("./routes/slot.routes");
const slotInfoRoutes = require("./routes/slot-info.routes");
const facultyAllocationRoutes = require("./routes/faculty-allocation.routes");
const semesterSlotConfigRoutes = require("./routes/semester-slot-config.routes");
const timetableCoordinatorRoutes = require("./routes/timetable-coordinator.routes");
const userRoutes = require("./routes/user.routes");
const studentAuthRoutes = require("./routes/student-auth.routes");
const systemConfigRoutes = require("./routes/system-config.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const projectAllocationRoutes = require("./routes/project-allocation.routes");
const marksRoutes = require("./routes/marks.routes");
const reportsRoutes = require("./routes/reports.routes");
const odRoutes = require("./routes/od.routes");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());

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
app.use(express.json({ limit: "10mb" })); // Parse JSON bodies (marks-entry payloads for large classes exceed the 100kb default)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/student-auth", studentAuthRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/semesters", semesterRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/slot-info", slotInfoRoutes);
app.use("/api/faculty-allocations", facultyAllocationRoutes);
app.use("/api/semester-slot-configs", semesterSlotConfigRoutes);
app.use("/api/slot-conflicts", require("./routes/slot-conflict.routes"));
app.use("/api/timetable-coordinators", timetableCoordinatorRoutes);
app.use("/api/users", userRoutes);
app.use(
  "/api/course-registration",
  require("./routes/course-registration.routes")
);
app.use(
  "/api/course-withdrawal",
  require("./routes/course-withdrawal.routes")
);
app.use("/api/system-config", systemConfigRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/project-allocations", projectAllocationRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/od", odRoutes);
app.use("/api/registration-blocks", require("./routes/registration-block.routes"));
app.use("/api/program-curriculum", require("./routes/program-curriculum.routes"));
app.use("/api/course-syllabus", require("./routes/course-syllabus.routes"));

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the SCFC LMS API" });
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
