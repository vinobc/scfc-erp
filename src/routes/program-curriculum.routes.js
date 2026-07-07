const express = require("express");
const controller = require("../controllers/program-curriculum.controller");
const {
  verifyToken,
  isAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.use(verifyToken);

// Any authenticated portal user (incl. students) can list & download PDF.
router.get("/", controller.listCurricula);
router.get("/:id/download/pdf", controller.downloadPdf);

// Admin-only.
router.post("/upload", isAdmin, controller.uploadCurriculum);
router.get("/:id/download/excel", isAdmin, controller.downloadExcel);
router.delete("/:id", isAdmin, controller.deleteCurriculum);

module.exports = router;
