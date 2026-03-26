const express = require("express");
const odController = require("../controllers/od.controller");
const {
  verifyToken,
  isDSWOrAdmin,
  isFacultyOrStaffOrAdmin,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.use(verifyToken);

// DSW routes
router.post("/events", isDSWOrAdmin, odController.createEvent);
router.delete("/events/:eventId", isDSWOrAdmin, odController.deleteEvent);

// Faculty search (for DSW coordinator selection)
router.get("/faculty-search", isDSWOrAdmin, odController.searchFaculty);

// Events listing (accessible to DSW and all faculty)
router.get("/events", isFacultyOrStaffOrAdmin, odController.getEvents);
router.get(
  "/events/:eventId",
  isFacultyOrStaffOrAdmin,
  odController.getEventDetails
);

// Activity management (faculty coordinators)
router.post(
  "/events/:eventId/activities",
  isFacultyOrStaffOrAdmin,
  odController.createActivity
);
router.put(
  "/activities/:activityId",
  isFacultyOrStaffOrAdmin,
  odController.updateActivity
);
router.delete(
  "/activities/:activityId",
  isFacultyOrStaffOrAdmin,
  odController.deleteActivity
);

// Student management within activities
router.get(
  "/activities/:activityId/students",
  isFacultyOrStaffOrAdmin,
  odController.getActivityStudents
);
router.post(
  "/activities/:activityId/students",
  isFacultyOrStaffOrAdmin,
  odController.addStudentToActivity
);
router.delete(
  "/activities/:activityId/students/:enrollmentNumber",
  isFacultyOrStaffOrAdmin,
  odController.removeStudentFromActivity
);

// Student lookup
router.get(
  "/student-lookup/:enrollmentNumber",
  isFacultyOrStaffOrAdmin,
  odController.lookupStudent
);

module.exports = router;
