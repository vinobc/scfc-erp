const express = require("express");
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth.middleware");

const router = express.Router();

// Auth routes
router.post("/login", authController.login);
router.post("/logout", verifyToken, authController.logout);
router.get("/me", verifyToken, authController.getCurrentUser);

module.exports = router;
