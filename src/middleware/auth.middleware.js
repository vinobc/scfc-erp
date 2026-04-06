const jwt = require("jsonwebtoken");

// JWT secret key - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-should-be-in-env";

// Enable auth debug logs by setting AUTH_DEBUG=true in .env
const authDebug = process.env.AUTH_DEBUG === "true";

// Verify token middleware
exports.verifyToken = (req, res, next) => {
  if (authDebug) {
    console.log(
      "DEBUG - Auth headers:",
      req.headers.authorization || req.headers["x-access-token"]
    );
  }

  const token = req.headers["x-access-token"] || req.headers.authorization;

  if (!token) {
    if (authDebug) console.log("DEBUG - No token provided in request");
    return res.status(403).json({ message: "No token provided" });
  }

  // Remove Bearer prefix if present
  const tokenString = token.startsWith("Bearer ") ? token.slice(7) : token;

  try {
    const decoded = jwt.verify(tokenString, JWT_SECRET);
    if (authDebug) console.log("DEBUG - Token verified for user ID:", decoded.id);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.username = decoded.username;
    // Extract impersonated_by flag if present (for admin proxy login)
    req.impersonatedBy = decoded.impersonated_by || null;
    req.enrollmentNo = decoded.enrollment_no || null;
    if (authDebug && req.impersonatedBy) {
      console.log(`DEBUG - User is being impersonated by admin ID: ${req.impersonatedBy}`);
    }
    next();
  } catch (error) {
    if (authDebug) console.log("DEBUG - Token verification failed:", error.message);
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
};

// Check if user has admin role
exports.isAdmin = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Require Admin Role" });
  }
  next();
};

// Check if user has staff or admin role
exports.isStaffOrAdmin = (req, res, next) => {
  if (req.userRole !== "admin" && req.userRole !== "staff") {
    return res.status(403).json({ message: "Require Staff or Admin Role" });
  }
  next();
};

// Check if user has faculty role
exports.isFaculty = (req, res, next) => {
  if (req.userRole !== "faculty" && req.userRole !== "admin") {
    return res.status(403).json({ message: "Require Faculty or Admin Role" });
  }
  next();
};

// Check if user has student role
exports.isStudent = (req, res, next) => {
  if (req.userRole !== "student" && req.userRole !== "admin") {
    return res.status(403).json({ message: "Require Student or Admin Role" });
  }
  next();
};

// Check if user has timetable coordinator role
exports.isTimetableCoordinator = (req, res, next) => {
  if (req.userRole !== "timetable_coordinator" && req.userRole !== "admin") {
    return res.status(403).json({
      message: "Require Timetable Coordinator or Admin Role",
    });
  }
  next();
};

// Check if user has faculty or timetable coordinator role
exports.isFacultyOrCoordinator = (req, res, next) => {
  if (
    req.userRole !== "faculty" &&
    req.userRole !== "timetable_coordinator" &&
    req.userRole !== "admin"
  ) {
    return res.status(403).json({
      message: "Require Faculty, Timetable Coordinator, or Admin Role",
    });
  }
  next();
};

// Check if user can access faculty allocation management (coordinators and admins)
exports.canManageFacultyAllocations = (req, res, next) => {
  if (req.userRole !== "timetable_coordinator" && req.userRole !== "admin") {
    return res.status(403).json({
      message:
        "Require Timetable Coordinator or Admin Role to manage faculty allocations",
    });
  }
  next();
};

// Check if user is DSW (Director of Student Welfare) or admin
// DSW is identified by username '316690@blr.amity.edu' (staff user)
exports.isDSWOrAdmin = async (req, res, next) => {
  if (req.userRole === "admin") return next();
  if (req.userRole !== "staff") {
    return res.status(403).json({ message: "Require DSW or Admin Role" });
  }
  try {
    const db = require("../config/db");
    const result = await db.query(
      'SELECT username FROM "user" WHERE user_id = $1',
      [req.userId]
    );
    if (!result.rows.length || result.rows[0].username !== "316690@blr.amity.edu") {
      return res.status(403).json({ message: "Require DSW or Admin Role" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Server error checking DSW role" });
  }
};

// Check if user has faculty, staff, or admin role
exports.isFacultyOrStaffOrAdmin = (req, res, next) => {
  if (!["admin", "faculty", "staff", "timetable_coordinator"].includes(req.userRole)) {
    return res
      .status(403)
      .json({ message: "Require Faculty, Staff, or Admin Role" });
  }
  next();
};

// Check if user can view timetables (faculty, coordinators, and admins)
exports.canViewTimetables = (req, res, next) => {
  if (
    req.userRole !== "faculty" &&
    req.userRole !== "timetable_coordinator" &&
    req.userRole !== "admin"
  ) {
    return res.status(403).json({
      message:
        "Require Faculty, Timetable Coordinator, or Admin Role to view timetables",
    });
  }
  next();
};
