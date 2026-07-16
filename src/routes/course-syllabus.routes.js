const express = require("express");
const controller = require("../controllers/course-syllabus.controller");
const {
  verifyToken,
  isAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.use(verifyToken);

// Any authenticated portal user (incl. students) can list/inspect/download PDF.
router.get("/", controller.listSyllabi);
router.get("/uploaded-courses", controller.listUploadedCourses);
router.get("/versions", controller.listVersions);
router.get("/details", controller.getDetails);
router.get("/:id/download/pdf", controller.downloadPdf);

// Admin-only.
router.post("/upload", isAdmin, controller.uploadSyllabus);
router.get("/:id/download/word", isAdmin, controller.downloadWord);
router.delete("/:id", isAdmin, controller.deleteSyllabus);

module.exports = router;
