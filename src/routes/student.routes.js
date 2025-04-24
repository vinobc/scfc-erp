const express = require("express");
const multer = require("multer");
const studentController = require("../controllers/student.controller");
const {
  verifyToken,
  isAdmin,
  isStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Apply auth middleware to all student routes
router.use(verifyToken);

// Student routes
router.get("/", studentController.getAllStudents);
router.get("/:enrollment_no", studentController.getStudentByEnrollment);

// Admin-only routes
router.post("/", isAdmin, studentController.createStudent);
router.put("/:enrollment_no", isAdmin, studentController.updateStudent);
router.delete("/:enrollment_no", isAdmin, studentController.deleteStudent);

// Excel import route
router.post(
  "/import",
  isAdmin,
  upload.single("file"),
  studentController.importStudents
);

module.exports = router;
