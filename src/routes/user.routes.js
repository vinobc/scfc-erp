const express = require("express");
const userController = require("../controllers/user.controller");
const { verifyToken, isAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all user routes
router.use(verifyToken);

// User routes (admin only)
router.get("/", isAdmin, userController.getAllUsers);
router.get("/:id", isAdmin, userController.getUserById);
router.post("/faculty", isAdmin, userController.createFacultyUser);
router.put("/:id", isAdmin, userController.updateUser);
router.delete("/:id", isAdmin, userController.deleteUser);

module.exports = router;
