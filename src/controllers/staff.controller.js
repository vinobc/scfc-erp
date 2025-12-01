const db = require("../config/db");

// Get all staff members
exports.getAllStaff = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM staff ORDER BY name`,
      []
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get all staff error:", error);
    res.status(500).json({ message: "Server error while fetching staff" });
  }
};

// Get staff by id
exports.getStaffById = async (req, res) => {
  try {
    const staffId = req.params.id;

    const result = await db.query(
      `SELECT * FROM staff WHERE staff_id = $1`,
      [staffId]
    );

    const staff = result.rows[0];

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.status(200).json(staff);
  } catch (error) {
    console.error("Get staff by id error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching staff details" });
  }
};

// Create new staff
exports.createStaff = async (req, res) => {
  try {
    const { name, designation, employee_id, department, email, is_active } =
      req.body;

    // Validate required fields
    if (!name || !employee_id || !department) {
      return res.status(400).json({
        message: "Name, employee ID, and department are required fields",
      });
    }

    // Check if employee_id already exists in staff table
    const existingStaff = await db.query(
      "SELECT COUNT(*) FROM staff WHERE employee_id = $1",
      [employee_id]
    );

    if (parseInt(existingStaff.rows[0].count) > 0) {
      return res.status(409).json({
        message: "Employee ID already exists in staff",
      });
    }

    // Check if employee_id already exists in faculty table
    const existingFaculty = await db.query(
      "SELECT COUNT(*) FROM faculty WHERE employee_id = $1",
      [employee_id]
    );

    if (parseInt(existingFaculty.rows[0].count) > 0) {
      return res.status(409).json({
        message: "Employee ID already exists in faculty",
      });
    }

    // Insert new staff
    const result = await db.query(
      `INSERT INTO staff
       (name, designation, employee_id, department, email, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        designation || null,
        employee_id,
        department,
        email || null,
        is_active === false ? false : true,
      ]
    );

    res.status(201).json({
      message: "Staff created successfully",
      staff: result.rows[0],
    });
  } catch (error) {
    console.error("Create staff error:", error);
    res.status(500).json({ message: "Server error while creating staff" });
  }
};

// Update staff
exports.updateStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    const { name, designation, employee_id, department, email, is_active } =
      req.body;

    // Validate required fields
    if (!name || !employee_id || !department) {
      return res.status(400).json({
        message: "Name, employee ID, and department are required fields",
      });
    }

    // Check if staff exists
    const staffExists = await db.query(
      "SELECT COUNT(*) FROM staff WHERE staff_id = $1",
      [staffId]
    );

    if (parseInt(staffExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Check if employee_id already exists for another staff
    const existingStaff = await db.query(
      "SELECT COUNT(*) FROM staff WHERE employee_id = $1 AND staff_id != $2",
      [employee_id, staffId]
    );

    if (parseInt(existingStaff.rows[0].count) > 0) {
      return res.status(409).json({
        message: "Employee ID already exists for another staff",
      });
    }

    // Check if employee_id already exists in faculty table
    const existingFaculty = await db.query(
      "SELECT COUNT(*) FROM faculty WHERE employee_id = $1",
      [employee_id]
    );

    if (parseInt(existingFaculty.rows[0].count) > 0) {
      return res.status(409).json({
        message: "Employee ID already exists in faculty",
      });
    }

    // Update staff
    const result = await db.query(
      `UPDATE staff
       SET name = $1,
           designation = $2,
           employee_id = $3,
           department = $4,
           email = $5,
           is_active = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE staff_id = $7
       RETURNING *`,
      [
        name,
        designation || null,
        employee_id,
        department,
        email || null,
        is_active === false ? false : true,
        staffId,
      ]
    );

    res.status(200).json({
      message: "Staff updated successfully",
      staff: result.rows[0],
    });
  } catch (error) {
    console.error("Update staff error:", error);
    res.status(500).json({ message: "Server error while updating staff" });
  }
};

// Toggle staff status (active/inactive)
exports.toggleStaffStatus = async (req, res) => {
  try {
    const staffId = req.params.id;
    const { is_active } = req.body;

    // Validate is_active parameter
    if (is_active === undefined) {
      return res
        .status(400)
        .json({ message: "is_active parameter is required" });
    }

    // Check if staff exists
    const staffExists = await db.query(
      "SELECT COUNT(*) FROM staff WHERE staff_id = $1",
      [staffId]
    );

    if (parseInt(staffExists.rows[0].count) === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Update staff status
    const result = await db.query(
      `UPDATE staff
       SET is_active = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE staff_id = $2
       RETURNING *`,
      [is_active, staffId]
    );

    res.status(200).json({
      message: `Staff ${is_active ? "activated" : "deactivated"} successfully`,
      staff: result.rows[0],
    });
  } catch (error) {
    console.error("Toggle staff status error:", error);
    res
      .status(500)
      .json({ message: "Server error while toggling staff status" });
  }
};

// Delete staff
exports.deleteStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    console.log(`Delete request for staff ID: ${staffId}`);

    // Check if staff exists
    const staffExists = await db.query(
      "SELECT COUNT(*) FROM staff WHERE staff_id = $1",
      [staffId]
    );

    console.log(`Staff exists query result:`, staffExists.rows[0]);

    if (parseInt(staffExists.rows[0].count) === 0) {
      console.log(`Staff with ID ${staffId} not found in database`);
      return res.status(404).json({ message: "Staff not found" });
    }

    // Delete staff
    console.log(`Executing DELETE for staff_id ${staffId}`);
    await db.query("DELETE FROM staff WHERE staff_id = $1", [staffId]);

    res.status(200).json({
      message: "Staff deleted successfully",
    });
  } catch (error) {
    console.error("Delete staff error:", error);
    res.status(500).json({
      message: "Server error while deleting staff",
      error: error.message,
    });
  }
};
