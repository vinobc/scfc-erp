const jwt = require("jsonwebtoken");

// JWT secret key - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-should-be-in-env";

// Verify token middleware
exports.verifyToken = (req, res, next) => {
  const token = req.headers["x-access-token"] || req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  // Remove Bearer prefix if present
  const tokenString = token.startsWith("Bearer ") ? token.slice(7) : token;

  try {
    const decoded = jwt.verify(tokenString, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
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
