const express = require("express");
const multer = require("multer");
const controller = require("../controllers/registration-block.controller");
const { verifyToken, isAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.use(verifyToken);
router.use(isAdmin);

router.get("/", controller.listBlocks);
router.post("/", controller.addBlock);
router.post("/import", upload.single("file"), controller.importBlocks);
router.put("/:enrollment_no/unblock", controller.unblockStudent);
router.get("/history/:enrollment_no", controller.getHistory);

module.exports = router;
