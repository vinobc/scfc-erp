const db = require("../config/db");

// Get all faculty allocations
exports.getAllFacultyAllocations = async (req, res) => {
  try {
    const { year, semesterType, employeeId, venue } = req.query;

    let query = `
      SELECT fa.*, c.course_name, c.theory, c.practical, c.credits,
             f.name as faculty_name, v.infra_type as venue_type
      FROM faculty_allocation fa
      JOIN course c ON fa.course_code = c.course_code
      JOIN faculty f ON fa.employee_id = f.employee_id
      JOIN venue v ON fa.venue = v.venue
      WHERE 1=1
    `;
    const params = [];

    if (year) {
      params.push(year);
      query += ` AND fa.slot_year = $${params.length}`;
    }

    if (semesterType) {
      params.push(semesterType);
      query += ` AND fa.semester_type = $${params.length}`;
    }

    if (employeeId) {
      params.push(employeeId);
      query += ` AND fa.employee_id = $${params.length}`;
    }

    if (venue) {
      params.push(venue);
      query += ` AND fa.venue = $${params.length}`;
    }

    query += ` ORDER BY fa.slot_year, fa.semester_type, fa.slot_day, fa.slot_time`;

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get faculty allocations error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching faculty allocations" });
  }
};

// Create new faculty allocation
exports.createFacultyAllocation = async (req, res) => {
  try {
    const {
      slot_year,
      semester_type,
      course_code,
      employee_id,
      venue,
      slot_day,
      slot_name,
      slot_time,
    } = req.body;

    // Validate required fields
    if (
      !slot_year ||
      !semester_type ||
      !course_code ||
      !employee_id ||
      !venue ||
      !slot_day ||
      !slot_name ||
      !slot_time
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for venue clash (different faculty for same venue/time)
    const venueClashCheck = await db.query(
      `SELECT fa.*, c.course_name, f.name as faculty_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.venue = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5 AND fa.employee_id != $6`,
      [slot_year, semester_type, venue, slot_day, slot_time, employee_id]
    );

    if (venueClashCheck.rows.length > 0) {
      const clash = venueClashCheck.rows[0];
      return res.status(409).json({
        message: `Venue clash: ${venue} is already booked on ${slot_day} at ${slot_time} for ${clash.course_name} by ${clash.faculty_name}`,
        type: "venue_clash",
        existingAllocation: clash,
      });
    }

    // Check for faculty clash (different course at same time)
    const facultyClashCheck = await db.query(
      `SELECT fa.*, c.course_name, v.venue as venue_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN venue v ON fa.venue = v.venue
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.employee_id = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5 AND fa.course_code != $6`,
      [slot_year, semester_type, employee_id, slot_day, slot_time, course_code]
    );

    if (facultyClashCheck.rows.length > 0) {
      const clash = facultyClashCheck.rows[0];
      return res.status(409).json({
        message: `Faculty clash: Faculty is already assigned to ${clash.course_name} in ${clash.venue_name} on ${slot_day} at ${slot_time}`,
        type: "faculty_clash",
        existingAllocation: clash,
      });
    }

    // Check for slot conflicts
    // Get conflicting slot names
    const conflictingSlots = await db.query(
      `SELECT conflicting_slot_name 
       FROM slot_conflict 
       WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
      [slot_year, semester_type, slot_name]
    );

    if (conflictingSlots.rows.length > 0) {
      const conflictingSlotNames = conflictingSlots.rows.map(
        (row) => row.conflicting_slot_name
      );

      // Check if faculty is already allocated in any conflicting slot
      const slotConflictCheck = await db.query(
        `SELECT fa.*, c.course_name, v.venue as venue_name
         FROM faculty_allocation fa
         JOIN course c ON fa.course_code = c.course_code
         JOIN venue v ON fa.venue = v.venue
         WHERE fa.slot_year = $1 AND fa.semester_type = $2 
         AND fa.employee_id = $3 AND fa.slot_name = ANY($4)`,
        [slot_year, semester_type, employee_id, conflictingSlotNames]
      );

      if (slotConflictCheck.rows.length > 0) {
        const conflict = slotConflictCheck.rows[0];
        return res.status(409).json({
          message: `Slot conflict: Faculty is already assigned to a conflicting slot ${conflict.slot_name} for ${conflict.course_name} in ${conflict.venue_name}`,
          type: "slot_conflict",
          existingAllocation: conflict,
        });
      }
    }

    // Enhanced logic for summer lab slot linking (both 2-hour and 4-hour)
    let linkedSlotName = null;
    let linkedSlotDetails = null;

    // Enhanced logic for both 2-hour and 4-hour lab courses in SUMMER semester
    if (
      semester_type === "SUMMER" &&
      slot_name.startsWith("L") &&
      slot_name.includes("+")
    ) {
      // Get course details to check if this is a 4-hour lab course (P=4)
      const courseResult = await db.query(
        `SELECT practical FROM course WHERE course_code = $1`,
        [course_code]
      );

      const coursePractical = courseResult.rows[0]?.practical || 0;
      console.log(
        `Course ${course_code} has practical hours: ${coursePractical}`
      );

      // For 4-hour lab courses (P=4), handle compound slot combinations
      if (coursePractical === 4 && slot_name.includes(",")) {
        console.log(
          `Processing 4-hour lab allocation for compound slot: ${slot_name}`
        );

        // Check for linked slot in semester_slot_config for 4-hour labs
        const linkedSlotsResult = await db.query(
          `SELECT linked_slots FROM semester_slot_config 
           WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3 
           AND course_theory = 0 AND course_practical = 4`,
          [slot_year, semester_type, slot_name]
        );

        if (
          linkedSlotsResult.rows.length > 0 &&
          linkedSlotsResult.rows[0].linked_slots &&
          linkedSlotsResult.rows[0].linked_slots.length > 0
        ) {
          linkedSlotName = linkedSlotsResult.rows[0].linked_slots[0];
          console.log(`Found linked afternoon slots: ${linkedSlotName}`);

          // For 4-hour courses, we need to validate that all required slots are available
          // Parse the morning and afternoon slot combinations
          const morningSlots = slot_name.split(", "); // ["L1+L2", "L3+L4"]
          const afternoonSlots = linkedSlotName.split(", "); // ["L21+L22", "L23+L24"]
          const allRequiredSlots = [...morningSlots, ...afternoonSlots];

          console.log(
            `4-hour lab requires slots: ${allRequiredSlots.join(", ")}`
          );

          // Check if any of the required slots are already allocated to other faculty
          for (const requiredSlot of allRequiredSlots) {
            const slotDetailsResult = await db.query(
              `SELECT slot_day, slot_time FROM slot 
               WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
              [slot_year, semester_type, requiredSlot]
            );

            if (slotDetailsResult.rows.length > 0) {
              const slotDetails = slotDetailsResult.rows[0];

              // Check if this specific slot is already allocated to another faculty
              const slotClashCheck = await db.query(
                `SELECT fa.*, c.course_name, f.name as faculty_name
                 FROM faculty_allocation fa
                 JOIN course c ON fa.course_code = c.course_code
                 JOIN faculty f ON fa.employee_id = f.employee_id
                 WHERE fa.slot_year = $1 AND fa.semester_type = $2 
                 AND fa.venue = $3 AND fa.slot_day = $4 
                 AND fa.slot_time = $5 AND fa.employee_id != $6`,
                [
                  slot_year,
                  semester_type,
                  venue,
                  slotDetails.slot_day,
                  slotDetails.slot_time,
                  employee_id,
                ]
              );

              if (slotClashCheck.rows.length > 0) {
                const clash = slotClashCheck.rows[0];
                return res.status(409).json({
                  message: `4-hour lab slot clash: Slot ${requiredSlot} is already booked by ${clash.faculty_name} for ${clash.course_name}`,
                  type: "4hour_lab_slot_clash",
                  existingAllocation: clash,
                });
              }

              // Check if faculty is already allocated in this slot for different course
              const facultySlotCheck = await db.query(
                `SELECT fa.*, c.course_name, v.venue as venue_name
                 FROM faculty_allocation fa
                 JOIN course c ON fa.course_code = c.course_code
                 JOIN venue v ON fa.venue = v.venue
                 WHERE fa.slot_year = $1 AND fa.semester_type = $2 
                 AND fa.employee_id = $3 AND fa.slot_day = $4 
                 AND fa.slot_time = $5 AND fa.course_code != $6`,
                [
                  slot_year,
                  semester_type,
                  employee_id,
                  slotDetails.slot_day,
                  slotDetails.slot_time,
                  course_code,
                ]
              );

              if (facultySlotCheck.rows.length > 0) {
                const clash = facultySlotCheck.rows[0];
                return res.status(409).json({
                  message: `Faculty clash in 4-hour lab: Faculty is already assigned to ${clash.course_name} in ${clash.venue_name} during slot ${requiredSlot}`,
                  type: "faculty_4hour_lab_clash",
                  existingAllocation: clash,
                });
              }
            }
          }

          // Set up linkedSlotDetails for the compound afternoon slots
          linkedSlotDetails = { isCompound: true, slots: afternoonSlots };
        }
      }
      // For regular 2-hour lab courses, use existing logic
      else if (coursePractical === 2 || !slot_name.includes(",")) {
        console.log(`Processing 2-hour lab allocation for slot: ${slot_name}`);

        // Check for linked slot in semester_slot_config for 2-hour labs
        const linkedSlotsResult = await db.query(
          `SELECT linked_slots FROM semester_slot_config 
           WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3 
           AND course_theory = 0 AND course_practical > 0 AND course_practical < 4`,
          [slot_year, semester_type, slot_name]
        );

        // If there's a linked slot for this lab slot in SUMMER semester
        if (
          linkedSlotsResult.rows.length > 0 &&
          linkedSlotsResult.rows[0].linked_slots &&
          linkedSlotsResult.rows[0].linked_slots.length > 0
        ) {
          linkedSlotName = linkedSlotsResult.rows[0].linked_slots[0];

          // Find the details of the linked slot (day and time)
          const linkedSlotDetailsResult = await db.query(
            `SELECT slot_day, slot_time FROM slot 
             WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
            [slot_year, semester_type, linkedSlotName]
          );

          if (linkedSlotDetailsResult.rows.length > 0) {
            linkedSlotDetails = linkedSlotDetailsResult.rows[0];

            // Check if the linked slot is already allocated to another faculty
            const linkedSlotCheck = await db.query(
              `SELECT fa.*, c.course_name, f.name as faculty_name
               FROM faculty_allocation fa
               JOIN course c ON fa.course_code = c.course_code
               JOIN faculty f ON fa.employee_id = f.employee_id
               WHERE fa.slot_year = $1 AND fa.semester_type = $2 
               AND fa.venue = $3 AND fa.slot_day = $4 
               AND fa.slot_time = $5 AND fa.employee_id != $6`,
              [
                slot_year,
                semester_type,
                venue,
                linkedSlotDetails.slot_day,
                linkedSlotDetails.slot_time,
                employee_id,
              ]
            );

            if (linkedSlotCheck.rows.length > 0) {
              const clash = linkedSlotCheck.rows[0];
              return res.status(409).json({
                message: `Linked slot clash: The linked slot ${linkedSlotName} is already booked by ${clash.faculty_name} for ${clash.course_name}`,
                type: "linked_slot_clash",
                existingAllocation: clash,
              });
            }

            // Check if faculty is already allocated in the linked slot for different course
            const facultyLinkedSlotCheck = await db.query(
              `SELECT fa.*, c.course_name, v.venue as venue_name
               FROM faculty_allocation fa
               JOIN course c ON fa.course_code = c.course_code
               JOIN venue v ON fa.venue = v.venue
               WHERE fa.slot_year = $1 AND fa.semester_type = $2 
               AND fa.employee_id = $3 AND fa.slot_day = $4 
               AND fa.slot_time = $5 AND fa.course_code != $6`,
              [
                slot_year,
                semester_type,
                employee_id,
                linkedSlotDetails.slot_day,
                linkedSlotDetails.slot_time,
                course_code,
              ]
            );

            if (facultyLinkedSlotCheck.rows.length > 0) {
              const clash = facultyLinkedSlotCheck.rows[0];
              return res.status(409).json({
                message: `Faculty clash in linked slot: Faculty is already assigned to ${clash.course_name} in ${clash.venue_name} during the linked slot time`,
                type: "faculty_linked_slot_clash",
                existingAllocation: clash,
              });
            }
          }
        }
      }
    }

    // Check if primary allocation already exists
    const existingPrimaryCheck = await db.query(
      `SELECT * FROM faculty_allocation
       WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
       AND employee_id = $4 AND venue = $5 AND slot_day = $6 
       AND slot_name = $7 AND slot_time = $8`,
      [
        slot_year,
        semester_type,
        course_code,
        employee_id,
        venue,
        slot_day,
        slot_name,
        slot_time,
      ]
    );

    let result;
    let primaryAllocationExists = false;

    if (existingPrimaryCheck.rows.length > 0) {
      // Primary allocation already exists
      primaryAllocationExists = true;
      result = existingPrimaryCheck;
    } else {
      // Insert primary allocation
      result = await db.query(
        `INSERT INTO faculty_allocation 
         (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          slot_year,
          semester_type,
          course_code,
          employee_id,
          venue,
          slot_day,
          slot_name,
          slot_time,
        ]
      );
    }

    // Handle T=4 theory courses (Fall 2025-26) - create allocations for all component slots
    let additionalAllocationsCreated = 0;
    if (slot_name.includes('+') && !slot_name.includes(',') && !slot_name.startsWith('L')) {
      // This is a T=4 theory slot like "B1+TB1"
      console.log(`Processing T=4 theory allocation for slot: ${slot_name}`);
      
      // Parse the component slots
      const slotComponents = slot_name.split('+'); // ["B1", "TB1"]
      console.log(`T=4 components: ${slotComponents.join(', ')}`);
      
      // For each component slot, find all its occurrences and create allocations
      for (const component of slotComponents) {
        // Get all slots for this component across the week
        const componentSlotsResult = await db.query(
          `SELECT slot_day, slot_time FROM slot 
           WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
          [slot_year, semester_type, component]
        );
        
        console.log(`Found ${componentSlotsResult.rows.length} slots for component ${component}`);
        
        // Create allocation for each occurrence of this component slot
        for (const componentSlot of componentSlotsResult.rows) {
          // Skip if this allocation already exists (like the primary one we just created)
          const existingCheck = await db.query(
            `SELECT * FROM faculty_allocation
             WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
             AND employee_id = $4 AND venue = $5 AND slot_day = $6 
             AND slot_name = $7 AND slot_time = $8`,
            [
              slot_year,
              semester_type,
              course_code,
              employee_id,
              venue,
              componentSlot.slot_day,
              slot_name, // Keep the combined name
              componentSlot.slot_time,
            ]
          );
          
          if (existingCheck.rows.length === 0) {
            try {
              await db.query(
                `INSERT INTO faculty_allocation 
                 (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  slot_year,
                  semester_type,
                  course_code,
                  employee_id,
                  venue,
                  componentSlot.slot_day,
                  slot_name, // Keep the combined name
                  componentSlot.slot_time,
                ]
              );
              additionalAllocationsCreated++;
              console.log(`✓ Created T=4 allocation for ${component} on ${componentSlot.slot_day} at ${componentSlot.slot_time}`);
            } catch (error) {
              console.error(`Error creating T=4 allocation for ${component}:`, error);
            }
          }
        }
      }
    }

    // Handle linked slot for SUMMER lab
    let linkedAllocationExists = false;
    if (semester_type === "SUMMER" && linkedSlotName && linkedSlotDetails) {
      if (linkedSlotDetails.isCompound) {
        // Handle 4-hour lab compound slots
        console.log(
          `Creating allocations for 4-hour lab: ${slot_name} + ${linkedSlotName}`
        );

        // Parse the primary morning slots and linked afternoon slots
        const morningSlots = slot_name.split(", "); // ["L1+L2", "L3+L4"]
        const afternoonSlots = linkedSlotName.split(", "); // ["L21+L22", "L23+L24"]

        console.log(`Morning slots to allocate: ${morningSlots.join(", ")}`);
        console.log(
          `Afternoon slots to allocate: ${afternoonSlots.join(", ")}`
        );

        // Create allocations for all slots (morning + afternoon)
        const allSlotsToAllocate = [...morningSlots, ...afternoonSlots];

        for (const slotToAllocate of allSlotsToAllocate) {
          // Skip the primary slot as it's already created above
          if (slotToAllocate === slot_name) {
            continue;
          }

          // Get slot details for this specific slot
          const slotDetailsResult = await db.query(
            `SELECT slot_day, slot_time FROM slot 
             WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
            [slot_year, semester_type, slotToAllocate]
          );

          if (slotDetailsResult.rows.length > 0) {
            const slotDetails = slotDetailsResult.rows[0];

            // Check if this allocation already exists
            const existingAllocationCheck = await db.query(
              `SELECT * FROM faculty_allocation
               WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
               AND employee_id = $4 AND venue = $5 AND slot_name = $6`,
              [
                slot_year,
                semester_type,
                course_code,
                employee_id,
                venue,
                slotToAllocate,
              ]
            );

            if (existingAllocationCheck.rows.length === 0) {
              try {
                // Insert allocation for this slot
                await db.query(
                  `INSERT INTO faculty_allocation 
                   (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                  [
                    slot_year,
                    semester_type,
                    course_code,
                    employee_id,
                    venue,
                    slotDetails.slot_day,
                    slotToAllocate,
                    slotDetails.slot_time,
                  ]
                );
                console.log(
                  `✓ Created allocation for 4-hour lab slot: ${slotToAllocate}`
                );
              } catch (error) {
                console.error(
                  `Error creating allocation for slot ${slotToAllocate}:`,
                  error
                );
                // Rollback primary if we just created it
                if (!primaryAllocationExists) {
                  await db.query(
                    `DELETE FROM faculty_allocation 
                     WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
                     AND employee_id = $4 AND venue = $5 AND slot_day = $6 
                     AND slot_name = $7 AND slot_time = $8`,
                    [
                      slot_year,
                      semester_type,
                      course_code,
                      employee_id,
                      venue,
                      slot_day,
                      slot_name,
                      slot_time,
                    ]
                  );
                }
                throw error;
              }
            } else {
              console.log(
                `✓ Allocation already exists for 4-hour lab slot: ${slotToAllocate}`
              );
              linkedAllocationExists = true;
            }
          }
        }
      } else {
        // Handle regular 2-hour lab linked slots (existing logic)
        // Check if linked allocation already exists
        const existingLinkedCheck = await db.query(
          `SELECT * FROM faculty_allocation
           WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
           AND employee_id = $4 AND venue = $5 AND slot_name = $6`,
          [
            slot_year,
            semester_type,
            course_code,
            employee_id,
            venue,
            linkedSlotName,
          ]
        );

        if (existingLinkedCheck.rows.length > 0) {
          // Linked allocation already exists
          linkedAllocationExists = true;
        } else {
          try {
            // Insert linked allocation
            await db.query(
              `INSERT INTO faculty_allocation 
               (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                slot_year,
                semester_type,
                course_code,
                employee_id,
                venue,
                linkedSlotDetails.slot_day,
                linkedSlotName,
                linkedSlotDetails.slot_time,
              ]
            );
          } catch (error) {
            console.error("Error creating linked allocation:", error);
            // Only rollback primary if we just created it
            if (!primaryAllocationExists) {
              await db.query(
                `DELETE FROM faculty_allocation 
                 WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
                 AND employee_id = $4 AND venue = $5 AND slot_day = $6 
                 AND slot_name = $7 AND slot_time = $8`,
                [
                  slot_year,
                  semester_type,
                  course_code,
                  employee_id,
                  venue,
                  slot_day,
                  slot_name,
                  slot_time,
                ]
              );
            }
            // We'll still consider it a success if the primary already existed
            if (primaryAllocationExists) {
              linkedAllocationExists = true; // Assume it exists to prevent further attempts
            } else {
              throw error;
            }
          }
        }
      }
    }

    // Determine appropriate status code and message
    const statusCode =
      primaryAllocationExists && linkedAllocationExists ? 200 : 201;
    let message = primaryAllocationExists
      ? "Faculty allocation already exists"
      : "Faculty allocation created successfully";
    
    // Add info about T=4 allocations
    if (additionalAllocationsCreated > 0) {
      message += ` (${additionalAllocationsCreated + 1} total slots allocated for T=4 course)`;
    }

    res.status(statusCode).json({
      message,
      allocation: result.rows[0],
      primaryAllocationExists,
      additionalAllocationsCreated,
      linkedAllocation: linkedSlotName
        ? {
            slot_name: linkedSlotName,
            slot_day: linkedSlotDetails?.slot_day,
            slot_time: linkedSlotDetails?.slot_time,
            exists: linkedAllocationExists,
            isCompound: linkedSlotDetails?.isCompound || false,
          }
        : null,
    });
  } catch (error) {
    console.error("Create faculty allocation error:", error);
    res.status(500).json({
      message: "Server error while creating faculty allocation",
      error: error.message,
    });
  }
};

// Get faculty timetable
exports.getFacultyTimetable = async (req, res) => {
  try {
    const { employeeId, year, semesterType } = req.query;

    if (!employeeId || !year || !semesterType) {
      return res.status(400).json({
        message: "Employee ID, year, and semester type are required",
      });
    }

    // Get faculty details
    const facultyResult = await db.query(
      `SELECT * FROM faculty WHERE employee_id = $1`,
      [employeeId]
    );

    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const faculty = facultyResult.rows[0];

    // Get allocations
    const allocationsResult = await db.query(
      `SELECT fa.*, c.course_name, c.theory, c.practical, c.credits,
              v.infra_type as venue_type
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN venue v ON fa.venue = v.venue
       WHERE fa.employee_id = $1 AND fa.slot_year = $2 AND fa.semester_type = $3
       ORDER BY fa.slot_day, fa.slot_time`,
      [employeeId, year, semesterType]
    );

    // For the summary, group T=0, P=4 course allocations by course+venue to combine slot pairs
    // But keep individual allocations for the timetable grid display
    const summaryAllocations = [];
    const p4CourseGroups = new Map();

    allocationsResult.rows.forEach((allocation) => {
      const isP4LabCourse = allocation.theory === 0 && allocation.practical === 4;
      
      if (isP4LabCourse) {
        // Group P=4 lab courses by course_code + venue for summary
        const groupKey = `${allocation.course_code}-${allocation.venue}`;
        
        if (!p4CourseGroups.has(groupKey)) {
          p4CourseGroups.set(groupKey, {
            ...allocation,
            slot_names: [],
            combined_allocation: true
          });
        }
        
        // Add this slot name to the group
        p4CourseGroups.get(groupKey).slot_names.push(allocation.slot_name);
      } else {
        // Keep non-P4 allocations as individual entries
        summaryAllocations.push(allocation);
      }
    });

    // Convert P=4 groups to final allocations with combined slot names for summary
    p4CourseGroups.forEach((group) => {
      // Sort and combine slot names
      const sortedSlots = group.slot_names.sort();
      group.slot_name = sortedSlots.join(', ');
      delete group.slot_names;
      summaryAllocations.push(group);
    });

    res.status(200).json({
      faculty: faculty,
      allocations: allocationsResult.rows, // Use original allocations for timetable grid
      summaryAllocations: summaryAllocations, // Use grouped allocations for summary
    });
  } catch (error) {
    console.error("Get faculty timetable error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching faculty timetable" });
  }
};

// Get class/venue timetable
exports.getClassTimetable = async (req, res) => {
  try {
    const { venue, year, semesterType } = req.query;

    if (!venue || !year || !semesterType) {
      return res.status(400).json({
        message: "Venue, year, and semester type are required",
      });
    }

    // Get venue details
    const venueResult = await db.query(`SELECT * FROM venue WHERE venue = $1`, [
      venue,
    ]);

    if (venueResult.rows.length === 0) {
      return res.status(404).json({ message: "Venue not found" });
    }

    const venueDetails = venueResult.rows[0];

    // Get allocations
    const allocationsResult = await db.query(
      `SELECT fa.*, c.course_name, c.theory, c.practical, c.credits,
              f.name as faculty_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.venue = $1 AND fa.slot_year = $2 AND fa.semester_type = $3
       ORDER BY fa.slot_day, fa.slot_time`,
      [venue, year, semesterType]
    );

    res.status(200).json({
      venue: venueDetails,
      allocations: allocationsResult.rows,
    });
  } catch (error) {
    console.error("Get class timetable error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching class timetable" });
  }
};

// Delete faculty allocation
exports.deleteFacultyAllocation = async (req, res) => {
  try {
    const {
      slot_year,
      semester_type,
      course_code,
      employee_id,
      venue,
      slot_day,
      slot_name,
      slot_time,
    } = req.body;

    // Validate all required fields for composite primary key
    if (
      !slot_year ||
      !semester_type ||
      !course_code ||
      !employee_id ||
      !venue ||
      !slot_day ||
      !slot_name ||
      !slot_time
    ) {
      return res.status(400).json({
        message: "All fields are required to identify the allocation",
      });
    }

    // Delete the primary allocation
    const result = await db.query(
      `DELETE FROM faculty_allocation 
       WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
       AND employee_id = $4 AND venue = $5 AND slot_day = $6 
       AND slot_name = $7 AND slot_time = $8
       RETURNING *`,
      [
        slot_year,
        semester_type,
        course_code,
        employee_id,
        venue,
        slot_day,
        slot_name,
        slot_time,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Faculty allocation not found" });
    }

    // For SUMMER semester lab slots, check for linked slot to delete as well
    let linkedSlotsDeleted = [];
    if (
      semester_type === "SUMMER" &&
      slot_name.startsWith("L") &&
      slot_name.includes("+")
    ) {
      // Get course details to check if this is a 4-hour lab course
      const courseResult = await db.query(
        `SELECT practical FROM course WHERE course_code = $1`,
        [course_code]
      );

      const coursePractical = courseResult.rows[0]?.practical || 0;

      if (coursePractical === 4 && slot_name.includes(",")) {
        // Handle 4-hour lab compound slots
        console.log(`Deleting 4-hour lab allocation: ${slot_name}`);

        // Check for linked slot in semester_slot_config
        const linkedSlotsResult = await db.query(
          `SELECT linked_slots FROM semester_slot_config 
           WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3 
           AND course_theory = 0 AND course_practical = 4`,
          [slot_year, semester_type, slot_name]
        );

        if (
          linkedSlotsResult.rows.length > 0 &&
          linkedSlotsResult.rows[0].linked_slots &&
          linkedSlotsResult.rows[0].linked_slots.length > 0
        ) {
          const linkedSlotName = linkedSlotsResult.rows[0].linked_slots[0];

          // Parse all slots that need to be deleted
          const morningSlots = slot_name.split(", ");
          const afternoonSlots = linkedSlotName.split(", ");
          const allSlotsToDelete = [...morningSlots, ...afternoonSlots];

          console.log(
            `4-hour lab slots to delete: ${allSlotsToDelete.join(", ")}`
          );

          // Delete all related allocations
          for (const slotToDelete of allSlotsToDelete) {
            // Skip the primary slot as it's already deleted above
            if (slotToDelete === slot_name) {
              continue;
            }

            const deleteResult = await db.query(
              `DELETE FROM faculty_allocation 
               WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
               AND employee_id = $4 AND venue = $5 AND slot_name = $6`,
              [
                slot_year,
                semester_type,
                course_code,
                employee_id,
                venue,
                slotToDelete,
              ]
            );

            if (deleteResult.rowCount > 0) {
              linkedSlotsDeleted.push(slotToDelete);
              console.log(`✓ Deleted 4-hour lab slot: ${slotToDelete}`);
            }
          }
        }
      } else {
        // Handle regular 2-hour lab linked slots (existing logic)
        const linkedSlotsResult = await db.query(
          `SELECT linked_slots FROM semester_slot_config 
           WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3 
           AND course_theory = 0 AND course_practical > 0 AND course_practical < 4`,
          [slot_year, semester_type, slot_name]
        );

        // If there's a linked slot for this lab slot in SUMMER semester
        if (
          linkedSlotsResult.rows.length > 0 &&
          linkedSlotsResult.rows[0].linked_slots &&
          linkedSlotsResult.rows[0].linked_slots.length > 0
        ) {
          const linkedSlotName = linkedSlotsResult.rows[0].linked_slots[0];

          // Delete the linked allocation if it exists
          const linkedResult = await db.query(
            `DELETE FROM faculty_allocation 
             WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
             AND employee_id = $4 AND venue = $5 AND slot_name = $6`,
            [
              slot_year,
              semester_type,
              course_code,
              employee_id,
              venue,
              linkedSlotName,
            ]
          );

          if (linkedResult.rowCount > 0) {
            linkedSlotsDeleted.push(linkedSlotName);
          }
        }
      }
    }

    res.status(200).json({
      message: "Faculty allocation deleted successfully",
      linkedSlotsDeleted: linkedSlotsDeleted,
    });
  } catch (error) {
    console.error("Delete faculty allocation error:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting faculty allocation" });
  }
};

// Get available slots for a course based on TPC
exports.getAvailableSlotsForCourse = async (req, res) => {
  try {
    const { courseCode, year, semesterType, componentType } = req.query;

    if (!courseCode || !year || !semesterType) {
      return res.status(400).json({
        message: "Course code, year, and semester type are required",
      });
    }

    // Get course details
    const courseResult = await db.query(
      `SELECT * FROM course WHERE course_code = $1`,
      [courseCode]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courseResult.rows[0];
    const theory = course.theory;
    const practical = course.practical;

    // Get available slots based on course T-P-C and semester slot configuration
    let configQuery = `
      SELECT ssc.* 
      FROM semester_slot_config ssc
      WHERE ssc.slot_year = $1 
      AND ssc.semester_type = $2 
      AND ssc.is_active = true
    `;

    const params = [year, semesterType];

    // For Theory-Embedded-Lab (TEL) courses with componentType specified
    if (course.course_type === "TEL" && componentType) {
      if (componentType === "theory") {
        params.push(theory);
        params.push(0); // No practical component
        configQuery += ` AND ssc.course_theory = $3 AND ssc.course_practical = $4`;
      } else if (componentType === "lab") {
        params.push(0); // No theory component
        params.push(practical);
        configQuery += ` AND ssc.course_theory = $3 AND ssc.course_practical = $4`;
      }
    } else {
      // For regular courses, filter based on T-P values
      if (theory > 0 && practical === 0) {
        // Theory-only course
        params.push(theory);
        configQuery += ` AND ssc.course_theory = $3 AND ssc.course_practical = 0`;
      } else if (theory === 0 && practical > 0) {
        // Lab-only course - check if it's 4-hour lab
        if (practical === 4) {
          // 4-hour lab course - get compound slot combinations
          params.push(practical);
          configQuery += ` AND ssc.course_theory = 0 AND ssc.course_practical = $3`;
          console.log(`Filtering for 4-hour lab course (P=${practical})`);
        } else {
          // Regular lab course (2-hour)
          params.push(practical);
          configQuery += ` AND ssc.course_theory = 0 AND ssc.course_practical = $3`;
          console.log(`Filtering for 2-hour lab course (P=${practical})`);
        }
      } else if (theory > 0 && practical > 0 && course.course_type !== "TEL") {
        // Regular course with both theory and practical
        if (practical === 4) {
          // Course with 4-hour lab component
          params.push(theory);
          configQuery += ` AND ((ssc.course_theory = $3 AND ssc.course_practical = 0) OR 
                               (ssc.course_theory = 0 AND ssc.course_practical = 4))`;
          console.log(
            `Filtering for course with theory and 4-hour lab (T=${theory}, P=${practical})`
          );
        } else {
          params.push(theory);
          configQuery += ` AND ((ssc.course_theory = $3 AND ssc.course_practical = 0) OR 
                               (ssc.course_theory = 0 AND ssc.course_practical > 0 AND ssc.course_practical < 4))`;
          console.log(
            `Filtering for course with theory and regular lab (T=${theory}, P=${practical})`
          );
        }
      }
    }

    configQuery += ` ORDER BY ssc.slot_name`;

    const configResult = await db.query(configQuery, params);

    // Extract slot names and handle linked slots
    const availableSlots = [];
    const slotLinks = {}; // to track linked slots

    configResult.rows.forEach((config) => {
      availableSlots.push(config.slot_name);

      // Track linked slots for courses with linked slots
      if (config.linked_slots && config.linked_slots.length > 0) {
        slotLinks[config.slot_name] = config.linked_slots;
      }
    });

    // If no slots found in the configuration, fall back to legacy behavior
    if (availableSlots.length === 0) {
      console.log(
        `No slot configuration found for course ${courseCode} (${theory}-${practical}-${course.credits}) in ${year} ${semesterType}`
      );

      // Get all slot definitions for the year and semester
      const slotsResult = await db.query(
        `SELECT * FROM slot 
         WHERE slot_year = $1 AND semester_type = $2 
         ORDER BY slot_day, slot_time`,
        [year, semesterType]
      );

      if (slotsResult.rows.length === 0) {
        return res.status(404).json({
          message: `No slots found for ${year} ${semesterType} semester`,
        });
      }

      // Group slots by their names to identify unique slot names
      const slotsByName = {};
      slotsResult.rows.forEach((slot) => {
        if (!slotsByName[slot.slot_name]) {
          slotsByName[slot.slot_name] = [];
        }
        slotsByName[slot.slot_name].push(slot);
      });

      // Filter based on component type
      if (componentType === "lab") {
        // If lab component, only include lab slots
        const labSlots = Object.keys(slotsByName).filter(
          (name) => name.startsWith("L") && name.includes("+")
        );
        availableSlots.push(...labSlots);
      } else if (componentType === "theory") {
        // If theory component, only include theory slots
        const theorySlots = Object.keys(slotsByName).filter(
          (name) => !name.startsWith("L") && !name.includes("+")
        );
        availableSlots.push(...theorySlots);
      } else {
        // If no component type specified or for non-TEL courses:
        // Add appropriate slots based on course type
        if (theory > 0) {
          const theorySlots = Object.keys(slotsByName).filter(
            (name) => !name.startsWith("L") && !name.includes("+")
          );
          availableSlots.push(...theorySlots);
        }

        if (practical > 0) {
          const labSlots = Object.keys(slotsByName).filter(
            (name) => name.startsWith("L") && name.includes("+")
          );
          availableSlots.push(...labSlots);
        }
      }

      console.log(
        `Using legacy behavior: Found ${availableSlots.length} slots`
      );
    }

    res.status(200).json({
      course: course,
      availableSlots: availableSlots,
      slotLinks: slotLinks,
    });
  } catch (error) {
    console.error("Get available slots error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching available slots" });
  }
};

// Update faculty allocation
exports.updateFacultyAllocation = async (req, res) => {
  try {
    const { oldAllocation, newAllocation } = req.body;

    // Start a transaction
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // Delete old allocation
      await client.query(
        `DELETE FROM faculty_allocation 
         WHERE slot_year = $1 AND semester_type = $2 AND course_code = $3 
         AND employee_id = $4 AND venue = $5 AND slot_day = $6 
         AND slot_name = $7 AND slot_time = $8`,
        [
          oldAllocation.slot_year,
          oldAllocation.semester_type,
          oldAllocation.course_code,
          oldAllocation.employee_id,
          oldAllocation.venue,
          oldAllocation.slot_day,
          oldAllocation.slot_name,
          oldAllocation.slot_time,
        ]
      );

      // Insert new allocation with clash checks
      // (Use the same clash checking logic as in createFacultyAllocation)

      await client.query("COMMIT");

      res.status(200).json({
        message: "Faculty allocation updated successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update faculty allocation error:", error);
    res
      .status(500)
      .json({ message: "Server error while updating faculty allocation" });
  }
};

// Check for conflicts without saving allocation
exports.checkConflicts = async (req, res) => {
  try {
    const { year, semesterType, courseCode, facultyId, slotName, venue } =
      req.query;

    console.log("Conflict check request:", req.query);

    // Validate minimum required fields for meaningful conflict checking
    if (!year || !semesterType) {
      return res.status(400).json({
        message: "Year and semester type are required for conflict checking",
        conflicts: [],
      });
    }

    const conflicts = [];
    let slotDetails = null;

    // If we have enough data, get slot details
    if (slotName) {
      const slotResult = await db.query(
        `SELECT slot_day, slot_time FROM slot 
         WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
        [year, semesterType, slotName]
      );

      if (slotResult.rows.length > 0) {
        slotDetails = slotResult.rows[0];
      }
    }

    // 1. VENUE CLASH CHECK
    if (venue && slotDetails && facultyId) {
      const venueClashCheck = await db.query(
        `SELECT fa.*, c.course_name, f.name as faculty_name
         FROM faculty_allocation fa
         JOIN course c ON fa.course_code = c.course_code
         JOIN faculty f ON fa.employee_id = f.employee_id
         WHERE fa.slot_year = $1 AND fa.semester_type = $2 
         AND fa.venue = $3 AND fa.slot_day = $4 
         AND fa.slot_time = $5 AND fa.employee_id != $6`,
        [
          year,
          semesterType,
          venue,
          slotDetails.slot_day,
          slotDetails.slot_time,
          facultyId,
        ]
      );

      if (venueClashCheck.rows.length > 0) {
        const clash = venueClashCheck.rows[0];
        conflicts.push({
          type: "venue_clash",
          severity: "error",
          message: `Venue ${venue} is already booked by ${clash.faculty_name} for ${clash.course_name}`,
          details: {
            conflictingFaculty: clash.faculty_name,
            conflictingCourse: clash.course_name,
            time: `${slotDetails.slot_day} ${slotDetails.slot_time}`,
          },
        });
      }
    }

    // 2. FACULTY CLASH CHECK
    if (facultyId && slotDetails && courseCode) {
      const facultyClashCheck = await db.query(
        `SELECT fa.*, c.course_name, v.venue as venue_name
         FROM faculty_allocation fa
         JOIN course c ON fa.course_code = c.course_code
         JOIN venue v ON fa.venue = v.venue
         WHERE fa.slot_year = $1 AND fa.semester_type = $2 
         AND fa.employee_id = $3 AND fa.slot_day = $4 
         AND fa.slot_time = $5 AND fa.course_code != $6`,
        [
          year,
          semesterType,
          facultyId,
          slotDetails.slot_day,
          slotDetails.slot_time,
          courseCode,
        ]
      );

      if (facultyClashCheck.rows.length > 0) {
        const clash = facultyClashCheck.rows[0];
        conflicts.push({
          type: "faculty_clash",
          severity: "error",
          message: `Faculty is already teaching ${clash.course_name} in ${clash.venue_name}`,
          details: {
            conflictingCourse: clash.course_name,
            conflictingVenue: clash.venue_name,
            time: `${slotDetails.slot_day} ${slotDetails.slot_time}`,
          },
        });
      }
    }

    // 3. SLOT CONFLICT CHECK
    if (facultyId && slotName) {
      const conflictingSlots = await db.query(
        `SELECT conflicting_slot_name 
         FROM slot_conflict 
         WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
        [year, semesterType, slotName]
      );

      if (conflictingSlots.rows.length > 0) {
        const conflictingSlotNames = conflictingSlots.rows.map(
          (row) => row.conflicting_slot_name
        );

        const slotConflictCheck = await db.query(
          `SELECT fa.*, c.course_name, v.venue as venue_name
           FROM faculty_allocation fa
           JOIN course c ON fa.course_code = c.course_code
           JOIN venue v ON fa.venue = v.venue
           WHERE fa.slot_year = $1 AND fa.semester_type = $2 
           AND fa.employee_id = $3 AND fa.slot_name = ANY($4)`,
          [year, semesterType, facultyId, conflictingSlotNames]
        );

        if (slotConflictCheck.rows.length > 0) {
          const conflict = slotConflictCheck.rows[0];
          conflicts.push({
            type: "slot_conflict",
            severity: "error",
            message: `Slot conflicts with already allocated ${conflict.slot_name} for ${conflict.course_name}`,
            details: {
              conflictingSlot: conflict.slot_name,
              conflictingCourse: conflict.course_name,
              conflictingVenue: conflict.venue_name,
            },
          });
        }
      }
    }

    // 4. SUMMER LAB LINKING CONFLICTS
    if (
      semesterType === "SUMMER" &&
      slotName &&
      slotName.startsWith("L") &&
      slotName.includes("+") &&
      courseCode &&
      facultyId &&
      venue
    ) {
      // Get course details to check if this is a 4-hour lab course
      const courseResult = await db.query(
        `SELECT practical FROM course WHERE course_code = $1`,
        [courseCode]
      );

      const coursePractical = courseResult.rows[0]?.practical || 0;

      // Check for linked slot conflicts
      const linkedSlotsResult = await db.query(
        `SELECT linked_slots FROM semester_slot_config 
         WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3 
         AND course_theory = 0 AND course_practical > 0`,
        [year, semesterType, slotName]
      );

      if (
        linkedSlotsResult.rows.length > 0 &&
        linkedSlotsResult.rows[0].linked_slots
      ) {
        const linkedSlotNames = linkedSlotsResult.rows[0].linked_slots;

        for (const linkedSlotName of linkedSlotNames) {
          // For compound slots, check all individual slots
          const slotsToCheck = linkedSlotName.includes(",")
            ? linkedSlotName.split(", ").map((s) => s.trim())
            : [linkedSlotName];

          for (const individualSlot of slotsToCheck) {
            const linkedSlotDetailsResult = await db.query(
              `SELECT slot_day, slot_time FROM slot 
               WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
              [year, semesterType, individualSlot]
            );

            if (linkedSlotDetailsResult.rows.length > 0) {
              const linkedSlotDetails = linkedSlotDetailsResult.rows[0];

              // Check venue clash for linked slot
              const linkedVenueClash = await db.query(
                `SELECT fa.*, c.course_name, f.name as faculty_name
                 FROM faculty_allocation fa
                 JOIN course c ON fa.course_code = c.course_code
                 JOIN faculty f ON fa.employee_id = f.employee_id
                 WHERE fa.slot_year = $1 AND fa.semester_type = $2 
                 AND fa.venue = $3 AND fa.slot_day = $4 
                 AND fa.slot_time = $5 AND fa.employee_id != $6`,
                [
                  year,
                  semesterType,
                  venue,
                  linkedSlotDetails.slot_day,
                  linkedSlotDetails.slot_time,
                  facultyId,
                ]
              );

              if (linkedVenueClash.rows.length > 0) {
                const clash = linkedVenueClash.rows[0];
                conflicts.push({
                  type: "linked_slot_venue_clash",
                  severity: "error",
                  message: `Linked slot ${individualSlot} venue conflict: ${venue} already booked by ${clash.faculty_name}`,
                  details: {
                    linkedSlot: individualSlot,
                    conflictingFaculty: clash.faculty_name,
                    conflictingCourse: clash.course_name,
                    time: `${linkedSlotDetails.slot_day} ${linkedSlotDetails.slot_time}`,
                  },
                });
              }

              // Check faculty clash for linked slot
              const linkedFacultyClash = await db.query(
                `SELECT fa.*, c.course_name, v.venue as venue_name
                 FROM faculty_allocation fa
                 JOIN course c ON fa.course_code = c.course_code
                 JOIN venue v ON fa.venue = v.venue
                 WHERE fa.slot_year = $1 AND fa.semester_type = $2 
                 AND fa.employee_id = $3 AND fa.slot_day = $4 
                 AND fa.slot_time = $5 AND fa.course_code != $6`,
                [
                  year,
                  semesterType,
                  facultyId,
                  linkedSlotDetails.slot_day,
                  linkedSlotDetails.slot_time,
                  courseCode,
                ]
              );

              if (linkedFacultyClash.rows.length > 0) {
                const clash = linkedFacultyClash.rows[0];
                conflicts.push({
                  type: "linked_slot_faculty_clash",
                  severity: "error",
                  message: `Faculty conflict in linked slot ${individualSlot}: already teaching ${clash.course_name}`,
                  details: {
                    linkedSlot: individualSlot,
                    conflictingCourse: clash.course_name,
                    conflictingVenue: clash.venue_name,
                    time: `${linkedSlotDetails.slot_day} ${linkedSlotDetails.slot_time}`,
                  },
                });
              }
            }
          }
        }
      }
    }

    // Return results
    const hasConflicts = conflicts.length > 0;
    res.status(200).json({
      hasConflicts,
      conflicts,
      message: hasConflicts
        ? `Found ${conflicts.length} conflict(s)`
        : "No conflicts detected",
      checkedParameters: {
        year,
        semesterType,
        courseCode: courseCode || null,
        facultyId: facultyId || null,
        slotName: slotName || null,
        venue: venue || null,
      },
    });
  } catch (error) {
    console.error("Check conflicts error:", error);
    res.status(500).json({
      message: "Server error while checking conflicts",
      error: error.message,
      hasConflicts: false,
      conflicts: [],
    });
  }
};

// Get available slots for a faculty considering all conflicts and cross-day requirements
exports.getAvailableSlotsForFaculty = async (req, res) => {
  try {
    const { facultyId, courseCode, year, semesterType, componentType } =
      req.query;

    if (!facultyId || !courseCode || !year || !semesterType) {
      return res.status(400).json({
        message:
          "Faculty ID, course code, year, and semester type are required",
      });
    }

    // Get course details
    const courseResult = await db.query(
      `SELECT * FROM course WHERE course_code = $1`,
      [courseCode]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courseResult.rows[0];

    // Get base available slots using existing logic
    const baseAvailableSlots = await getBaseAvailableSlots(
      course,
      year,
      semesterType,
      componentType
    );

    // Get faculty's existing allocations
    const facultyAllocations = await getFacultyAllocations(
      facultyId,
      year,
      semesterType
    );

    // Get all slot definitions for cross-day validation
    const allSlots = await db.query(
      `SELECT * FROM slot WHERE slot_year = $1 AND semester_type = $2 ORDER BY slot_day, slot_time`,
      [year, semesterType]
    );

    // Filter slots based on faculty availability and cross-day requirements
    const availableSlots = await filterSlotsForFaculty(
      baseAvailableSlots.availableSlots,
      baseAvailableSlots.slotLinks,
      facultyAllocations,
      allSlots.rows,
      year,
      semesterType,
      course
    );

    res.status(200).json({
      course: course,
      availableSlots: availableSlots.available,
      disabledSlots: availableSlots.disabled,
      slotLinks: baseAvailableSlots.slotLinks,
    });
  } catch (error) {
    console.error("Get available slots for faculty error:", error);
    res.status(500).json({
      message: "Server error while fetching available slots for faculty",
    });
  }
};

// Helper function to get base available slots (reuses existing logic)
async function getBaseAvailableSlots(
  course,
  year,
  semesterType,
  componentType
) {
  const theory = course.theory;
  const practical = course.practical;

  // Get available slots based on course T-P-C and semester slot configuration
  let configQuery = `
    SELECT ssc.* 
    FROM semester_slot_config ssc
    WHERE ssc.slot_year = $1 
    AND ssc.semester_type = $2 
    AND ssc.is_active = true
  `;

  const params = [year, semesterType];

  // Apply the same filtering logic as existing getAvailableSlotsForCourse
  if (course.course_type === "TEL" && componentType) {
    if (componentType === "theory") {
      params.push(theory);
      params.push(0);
      configQuery += ` AND ssc.course_theory = $3 AND ssc.course_practical = $4`;
    } else if (componentType === "lab") {
      params.push(0);
      params.push(practical);
      configQuery += ` AND ssc.course_theory = $3 AND ssc.course_practical = $4`;
    }
  } else {
    if (theory > 0 && practical === 0) {
      params.push(theory);
      configQuery += ` AND ssc.course_theory = $3 AND ssc.course_practical = 0`;
    } else if (theory === 0 && practical > 0) {
      if (practical === 4) {
        params.push(practical);
        configQuery += ` AND ssc.course_theory = 0 AND ssc.course_practical = $3`;
      } else {
        params.push(practical);
        configQuery += ` AND ssc.course_theory = 0 AND ssc.course_practical = $3`;
      }
    } else if (theory > 0 && practical > 0 && course.course_type !== "TEL") {
      if (practical === 4) {
        params.push(theory);
        configQuery += ` AND ((ssc.course_theory = $3 AND ssc.course_practical = 0) OR 
                             (ssc.course_theory = 0 AND ssc.course_practical = 4))`;
      } else {
        params.push(theory);
        configQuery += ` AND ((ssc.course_theory = $3 AND ssc.course_practical = 0) OR 
                             (ssc.course_theory = 0 AND ssc.course_practical > 0 AND ssc.course_practical < 4))`;
      }
    }
  }

  configQuery += ` ORDER BY ssc.slot_name`;

  const configResult = await db.query(configQuery, params);

  const availableSlots = [];
  const slotLinks = {};

  configResult.rows.forEach((config) => {
    availableSlots.push(config.slot_name);
    if (config.linked_slots && config.linked_slots.length > 0) {
      slotLinks[config.slot_name] = config.linked_slots;
    }
  });

  return { availableSlots, slotLinks };
}

// Helper to parse compound slots for P=4 courses
function parseCompoundSlots(slotName) {
  if (!slotName || typeof slotName !== 'string') return [slotName];
  // "L1+L2, L3+L4" → ["L1+L2", "L3+L4"]
  return slotName.includes(',') ? 
    slotName.split(',').map(s => s.trim()) : [slotName];
}

// Helper function to get faculty allocations
async function getFacultyAllocations(facultyId, year, semesterType) {
  const result = await db.query(
    `SELECT * FROM faculty_allocation 
     WHERE employee_id = $1 AND slot_year = $2 AND semester_type = $3`,
    [facultyId, year, semesterType]
  );
  
  return result.rows;
}

// Main filtering logic for faculty availability and cross-day requirements
async function filterSlotsForFaculty(
  baseSlots,
  slotLinks,
  facultyAllocations,
  allSlots,
  year,
  semesterType,
  course
) {
  const available = [];
  const disabled = [];

  // Create maps for quick lookup - Enhanced for P=4 lab pair conflict detection
  const allocatedSlotMap = new Set();
  const allocatedTimeMap = new Map(); // day -> time -> slotName

  facultyAllocations.forEach((allocation) => {
    // Store individual slot names (like L1+L2, L21+L22) for P=4 conflict checking
    allocatedSlotMap.add(allocation.slot_name);

    if (!allocatedTimeMap.has(allocation.slot_day)) {
      allocatedTimeMap.set(allocation.slot_day, new Map());
    }
    allocatedTimeMap
      .get(allocation.slot_day)
      .set(allocation.slot_time, allocation.slot_name);
  });

  // Get slot conflict rules
  const conflictRules = await db.query(
    `SELECT slot_name, conflicting_slot_name FROM slot_conflict 
     WHERE slot_year = $1 AND semester_type = $2`,
    [year, semesterType]
  );

  const conflictMap = new Map();
  conflictRules.rows.forEach((rule) => {
    if (!conflictMap.has(rule.slot_name)) {
      conflictMap.set(rule.slot_name, []);
    }
    conflictMap.get(rule.slot_name).push(rule.conflicting_slot_name);
  });

  // Check each base slot
  for (const slotName of baseSlots) {
    const availability = await checkSlotAvailability(
      slotName,
      slotLinks,
      allocatedSlotMap,
      allocatedTimeMap,
      conflictMap,
      allSlots,
      course
    );

    if (availability.available) {
      available.push(slotName);
    } else {
      disabled.push({
        slotName: slotName,
        reason: availability.reason,
        details: availability.details,
      });
    }
  }

  return { available, disabled };
}

// Check if a slot (or slot combination) is fully available across all required days
async function checkSlotAvailability(
  slotName,
  slotLinks,
  allocatedSlotMap,
  allocatedTimeMap,
  conflictMap,
  allSlots,
  course
) {
  // For P=4 compound slots (like "L1+L2, L21+L22"), check if ANY component is already allocated
  if (slotName.includes(',') && course.practical === 4) {
    const slotComponents = parseCompoundSlots(slotName);
    for (const component of slotComponents) {
      if (allocatedSlotMap.has(component)) {
        return {
          available: false,
          reason: "P=4 lab pair conflict",
          details: `Lab pair ${component} is already allocated to this faculty`,
        };
      }
    }
  }

  // If individual slot is directly allocated (for regular P=2 labs or individual checks)
  if (allocatedSlotMap.has(slotName)) {
    return {
      available: false,
      reason: "Already allocated",
      details: `Slot ${slotName} is already allocated to this faculty`,
    };
  }

  // Get all slots involved in this allocation (including linked slots)
  const involvedSlots = [slotName];
  if (slotLinks[slotName]) {
    involvedSlots.push(...slotLinks[slotName]);
  }

  // For combination slots (like E+F for 4-credit theory), check cross-day availability
  if (slotName.includes("+") || isPartOfCombination(slotName, course)) {
    const combinationCheck = await checkCombinationAvailability(
      slotName,
      allocatedSlotMap,
      allocatedTimeMap,
      conflictMap,
      allSlots,
      course
    );

    if (!combinationCheck.available) {
      return combinationCheck;
    }
  }

  // Check each involved slot for conflicts
  for (const involvedSlot of involvedSlots) {
    // Check direct conflicts
    if (allocatedSlotMap.has(involvedSlot)) {
      return {
        available: false,
        reason: "Linked slot conflict",
        details: `Linked slot ${involvedSlot} is already allocated`,
      };
    }

    // Check slot conflict rules
    if (conflictMap.has(involvedSlot)) {
      const conflictingSlots = conflictMap.get(involvedSlot);
      for (const conflictingSlot of conflictingSlots) {
        if (allocatedSlotMap.has(conflictingSlot)) {
          return {
            available: false,
            reason: "Slot conflict rule",
            details: `Slot ${involvedSlot} conflicts with allocated slot ${conflictingSlot}`,
          };
        }
      }
    }

    // Check time-based conflicts
    const timeConflict = checkTimeBasedConflicts(
      involvedSlot,
      allocatedTimeMap,
      allSlots
    );
    if (!timeConflict.available) {
      return timeConflict;
    }
  }

  return { available: true };
}

// Check if a slot is part of a combination (like E is part of E+F for 4-credit courses)
function isPartOfCombination(slotName, course) {
  // For 4-credit theory courses, slots like E, F are part of E+F combination
  if (
    course.theory >= 4 &&
    !slotName.startsWith("L") &&
    !slotName.includes("+")
  ) {
    const theoryCombinations = ["E", "F"]; // Add other combination patterns as needed
    return theoryCombinations.includes(slotName);
  }
  return false;
}

// Check combination availability across all days (THE KEY FUNCTION)
async function checkCombinationAvailability(
  slotName,
  allocatedSlotMap,
  allocatedTimeMap,
  conflictMap,
  allSlots,
  course
) {
  // For 4-credit theory, E requires E+F combination
  if (slotName === "E" && course.theory >= 4) {
    return await checkEFCombinationAvailability(
      allocatedSlotMap,
      allocatedTimeMap,
      conflictMap,
      allSlots
    );
  }

  // Add other combination checks as needed (A+TA, B+TB, etc.)

  return { available: true };
}

// Check E+F combination availability across ALL days
async function checkEFCombinationAvailability(
  allocatedSlotMap,
  allocatedTimeMap,
  conflictMap,
  allSlots
) {
  const days = ["MON", "TUE", "WED", "THU", "FRI"];

  for (const day of days) {
    // Find E and F slots for this day
    const eSlots = allSlots.filter(
      (slot) => slot.slot_day === day && slot.slot_name === "E"
    );
    const fSlots = allSlots.filter(
      (slot) => slot.slot_day === day && slot.slot_name === "F"
    );

    if (eSlots.length === 0 || fSlots.length === 0) {
      continue; // Skip days that don't have E or F slots
    }

    // Check if F is available on this day
    for (const fSlot of fSlots) {
      // Check direct allocation
      if (allocatedSlotMap.has("F")) {
        return {
          available: false,
          reason: "F slot blocked",
          details: `F slot blocked on ${day} due to existing allocation`,
        };
      }

      // Check time-based conflicts
      if (allocatedTimeMap.has(day)) {
        const dayAllocations = allocatedTimeMap.get(day);
        if (dayAllocations.has(fSlot.slot_time)) {
          return {
            available: false,
            reason: "F slot time conflict",
            details: `F slot time blocked on ${day} at ${fSlot.slot_time} due to existing allocation`,
          };
        }
      }

      // Check slot conflict rules for F
      if (conflictMap.has("F")) {
        const conflictingSlots = conflictMap.get("F");
        for (const conflictingSlot of conflictingSlots) {
          if (allocatedSlotMap.has(conflictingSlot)) {
            return {
              available: false,
              reason: "F slot conflict rule",
              details: `F slot blocked on ${day} due to conflict with allocated slot ${conflictingSlot}`,
            };
          }
        }
      }
    }
  }

  return { available: true };
}

// Check time-based conflicts
function checkTimeBasedConflicts(slotName, allocatedTimeMap, allSlots) {
  const slotDefinitions = allSlots.filter(
    (slot) => slot.slot_name === slotName
  );

  for (const slotDef of slotDefinitions) {
    if (allocatedTimeMap.has(slotDef.slot_day)) {
      const dayAllocations = allocatedTimeMap.get(slotDef.slot_day);
      if (dayAllocations.has(slotDef.slot_time)) {
        return {
          available: false,
          reason: "Time conflict",
          details: `Time slot blocked on ${slotDef.slot_day} at ${slotDef.slot_time}`,
        };
      }
    }
  }

  return { available: true };
}

// Get courses view with grouped allocations
exports.getCoursesView = async (req, res) => {
  try {
    const { year, semesterType } = req.query;

    if (!year || !semesterType) {
      return res.status(400).json({
        message: "Year and semester type are required",
      });
    }

    // Get all allocations for the specified year and semester
    const allocationsResult = await db.query(
      `SELECT 
        fa.course_code,
        c.course_name,
        c.theory,
        c.practical,
        c.credits,
        c.course_type,
        fa.slot_name,
        fa.slot_day,
        fa.slot_time,
        fa.venue,
        v.infra_type as venue_type,
        f.name as faculty_name,
        f.employee_id
      FROM faculty_allocation fa
      JOIN course c ON fa.course_code = c.course_code
      JOIN faculty f ON fa.employee_id = f.employee_id
      JOIN venue v ON fa.venue = v.venue
      WHERE fa.slot_year = $1 AND fa.semester_type = $2
      ORDER BY fa.course_code, fa.slot_name, fa.slot_day, fa.slot_time`,
      [year, semesterType]
    );

    // Group allocations by course
    const coursesMap = new Map();

    allocationsResult.rows.forEach((allocation) => {
      const courseCode = allocation.course_code;

      if (!coursesMap.has(courseCode)) {
        coursesMap.set(courseCode, {
          course_code: allocation.course_code,
          course_name: allocation.course_name,
          theory: allocation.theory,
          practical: allocation.practical,
          credits: allocation.credits,
          course_type: allocation.course_type,
          allocations: [],
        });
      }

      // Add this allocation to the course
      coursesMap.get(courseCode).allocations.push({
        slot_name: allocation.slot_name,
        slot_day: allocation.slot_day,
        slot_time: allocation.slot_time,
        venue: allocation.venue,
        venue_type: allocation.venue_type,
        faculty_name: allocation.faculty_name,
        employee_id: allocation.employee_id,
      });
    });

    // Convert map to array
    const courses = Array.from(coursesMap.values());

    res.status(200).json({
      year,
      semesterType,
      courses,
      totalCourses: courses.length,
      totalAllocations: allocationsResult.rows.length,
    });
  } catch (error) {
    console.error("Get courses view error:", error);
    res.status(500).json({
      message: "Server error while fetching courses view",
    });
  }
};

// Get available years and semesters for courses view
exports.getAvailableYearsAndSemesters = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT fa.slot_year, fa.semester_type
      FROM faculty_allocation fa
      ORDER BY fa.slot_year DESC, fa.semester_type`
    );

    // Group by year
    const yearsMap = new Map();

    result.rows.forEach((row) => {
      const year = row.slot_year;
      if (!yearsMap.has(year)) {
        yearsMap.set(year, {
          year: year,
          semesters: [],
        });
      }
      yearsMap.get(year).semesters.push(row.semester_type);
    });

    const years = Array.from(yearsMap.values());

    res.status(200).json(years);
  } catch (error) {
    console.error("Get available years and semesters error:", error);
    res.status(500).json({
      message: "Server error while fetching available years and semesters",
    });
  }
};

// Validate lab pair combination for P=4 courses (Fall 2025-26)
exports.validateLabPairCombination = async (req, res) => {
  try {
    const { pair1, pair2, facultyId, venue, year, semesterType } = req.query;

    // Simple test response first
    return res.status(200).json({
      valid: true,
      message: "Test response - validation endpoint is working",
      pairs: { pair1, pair2 },
      facultyId,
      venue,
      year,
      semesterType
    });

    if (!pair1 || !pair2 || !facultyId || !venue || !year || !semesterType) {
      return res.status(400).json({
        message: "All parameters are required for lab pair validation",
      });
    }

    // Check if pairs are the same
    if (pair1 === pair2) {
      return res.status(400).json({
        valid: false,
        message: "Cannot select the same lab pair twice",
      });
    }

    const conflicts = [];

    // Check if the two selected lab pairs conflict with each other
    const pairConflictCheck = await db.query(
      `SELECT conflicting_slot_name 
       FROM slot_conflict 
       WHERE slot_year = $1 AND semester_type = $2 
       AND slot_name = $3 AND conflicting_slot_name = $4`,
      [year, semesterType, pair1, pair2]
    );

    if (pairConflictCheck.rows.length > 0) {
      conflicts.push({
        type: "pair_conflict",
        message: `Lab pairs ${pair1} and ${pair2} conflict with each other`,
      });
    }

    // Get slot details for both pairs
    const slot1Details = await db.query(
      `SELECT slot_day, slot_time FROM slot 
       WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
      [year, semesterType, pair1]
    );

    const slot2Details = await db.query(
      `SELECT slot_day, slot_time FROM slot 
       WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
      [year, semesterType, pair2]
    );

    if (slot1Details.rows.length === 0 || slot2Details.rows.length === 0) {
      return res.status(404).json({
        valid: false,
        message: "One or both lab pairs not found in the timetable",
      });
    }

    const slot1 = slot1Details.rows[0];
    const slot2 = slot2Details.rows[0];

    // Check venue conflicts for both pairs
    const venue1ClashCheck = await db.query(
      `SELECT fa.*, c.course_name, f.name as faculty_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.venue = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5 AND fa.employee_id != $6`,
      [year, semesterType, venue, slot1.slot_day, slot1.slot_time, facultyId]
    );

    const venue2ClashCheck = await db.query(
      `SELECT fa.*, c.course_name, f.name as faculty_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.venue = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5 AND fa.employee_id != $6`,
      [year, semesterType, venue, slot2.slot_day, slot2.slot_time, facultyId]
    );

    if (venue1ClashCheck.rows.length > 0) {
      const clash = venue1ClashCheck.rows[0];
      conflicts.push({
        type: "venue_conflict_pair1",
        message: `Venue ${venue} is already booked for ${pair1} by ${clash.faculty_name} for ${clash.course_name}`,
      });
    }

    if (venue2ClashCheck.rows.length > 0) {
      const clash = venue2ClashCheck.rows[0];
      conflicts.push({
        type: "venue_conflict_pair2",
        message: `Venue ${venue} is already booked for ${pair2} by ${clash.faculty_name} for ${clash.course_name}`,
      });
    }

    // Check faculty conflicts for both pairs
    const faculty1ClashCheck = await db.query(
      `SELECT fa.*, c.course_name, v.venue as venue_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN venue v ON fa.venue = v.venue
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.employee_id = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5`,
      [year, semesterType, facultyId, slot1.slot_day, slot1.slot_time]
    );

    const faculty2ClashCheck = await db.query(
      `SELECT fa.*, c.course_name, v.venue as venue_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN venue v ON fa.venue = v.venue
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.employee_id = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5`,
      [year, semesterType, facultyId, slot2.slot_day, slot2.slot_time]
    );

    if (faculty1ClashCheck.rows.length > 0) {
      const clash = faculty1ClashCheck.rows[0];
      conflicts.push({
        type: "faculty_conflict_pair1",
        message: `Faculty is already assigned during ${pair1} time to ${clash.course_name} in ${clash.venue_name}`,
      });
    }

    if (faculty2ClashCheck.rows.length > 0) {
      const clash = faculty2ClashCheck.rows[0];
      conflicts.push({
        type: "faculty_conflict_pair2",
        message: `Faculty is already assigned during ${pair2} time to ${clash.course_name} in ${clash.venue_name}`,
      });
    }

    const isValid = conflicts.length === 0;

    res.status(200).json({
      valid: isValid,
      conflicts: conflicts,
      message: isValid 
        ? `Lab pairs ${pair1} and ${pair2} can be allocated together` 
        : `Found ${conflicts.length} conflict(s)`,
      pairs: {
        pair1: { name: pair1, day: slot1.slot_day, time: slot1.slot_time },
        pair2: { name: pair2, day: slot2.slot_day, time: slot2.slot_time },
      },
    });
  } catch (error) {
    console.error("Validate lab pair combination error:", error);
    res.status(500).json({
      valid: false,
      message: "Server error while validating lab pair combination",
    });
  }
};

// Create faculty allocation with P=4 support (enhanced for Fall 2025-26)
exports.createFacultyAllocationP4 = async (req, res) => {
  try {
    const {
      slot_year,
      semester_type,
      course_code,
      employee_id,
      lab_pair_1,
      lab_pair_2,
      venue_type_1,
      venue_type_2,
      venue_1,
      venue_2,
    } = req.body;
    
    console.log('P=4 Allocation request:', req.body);

    // Validate required fields for P=4 allocation
    if (
      !slot_year ||
      !semester_type ||
      !course_code ||
      !employee_id ||
      !venue_1 ||
      !venue_2 ||
      !lab_pair_1 ||
      !lab_pair_2
    ) {
      return res.status(400).json({ message: "All fields including both venues are required for P=4 lab allocation" });
    }

    // Validate the course is P=4
    const courseResult = await db.query(
      `SELECT practical FROM course WHERE course_code = $1`,
      [course_code]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (courseResult.rows[0].practical !== 4) {
      return res.status(400).json({ 
        message: "This endpoint is only for P=4 courses (4-hour lab courses)" 
      });
    }

    // Get slot details for both pairs
    const slot1Details = await db.query(
      `SELECT slot_day, slot_time FROM slot 
       WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
      [slot_year, semester_type, lab_pair_1]
    );

    const slot2Details = await db.query(
      `SELECT slot_day, slot_time FROM slot 
       WHERE slot_year = $1 AND semester_type = $2 AND slot_name = $3`,
      [slot_year, semester_type, lab_pair_2]
    );

    if (slot1Details.rows.length === 0 || slot2Details.rows.length === 0) {
      return res.status(404).json({ message: "One or both lab pairs not found" });
    }

    const slot1 = slot1Details.rows[0];
    const slot2 = slot2Details.rows[0];

    // Enhanced validation for P=4 courses with separate venues
    
    // 1. Check conflicts between the two pairs
    const pairConflictCheck = await db.query(
      `SELECT conflicting_slot_name 
       FROM slot_conflict 
       WHERE slot_year = $1 AND semester_type = $2 
       AND slot_name = $3 AND conflicting_slot_name = $4`,
      [slot_year, semester_type, lab_pair_1, lab_pair_2]
    );

    if (pairConflictCheck.rows.length > 0) {
      return res.status(409).json({
        message: `Lab pairs ${lab_pair_1} and ${lab_pair_2} conflict with each other`,
        type: "lab_pair_conflict",
      });
    }

    // 2. Check venue clashes for first lab pair
    const venue1ClashCheck = await db.query(
      `SELECT fa.*, c.course_name, f.name as faculty_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.venue = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5 AND fa.employee_id != $6`,
      [slot_year, semester_type, venue_1, slot1.slot_day, slot1.slot_time, employee_id]
    );

    if (venue1ClashCheck.rows.length > 0) {
      const clash = venue1ClashCheck.rows[0];
      return res.status(409).json({
        message: `Venue clash: ${venue_1} is already booked for ${lab_pair_1} on ${slot1.slot_day} at ${slot1.slot_time} by ${clash.faculty_name} for ${clash.course_name}`,
        type: "venue_clash_pair1",
        existingAllocation: clash,
      });
    }

    // 3. Check venue clashes for second lab pair  
    const venue2ClashCheck = await db.query(
      `SELECT fa.*, c.course_name, f.name as faculty_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN faculty f ON fa.employee_id = f.employee_id
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.venue = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5 AND fa.employee_id != $6`,
      [slot_year, semester_type, venue_2, slot2.slot_day, slot2.slot_time, employee_id]
    );

    if (venue2ClashCheck.rows.length > 0) {
      const clash = venue2ClashCheck.rows[0];
      return res.status(409).json({
        message: `Venue clash: ${venue_2} is already booked for ${lab_pair_2} on ${slot2.slot_day} at ${slot2.slot_time} by ${clash.faculty_name} for ${clash.course_name}`,
        type: "venue_clash_pair2", 
        existingAllocation: clash,
      });
    }

    // 4. Check faculty conflicts for first lab pair
    const faculty1ClashCheck = await db.query(
      `SELECT fa.*, c.course_name, v.venue as venue_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN venue v ON fa.venue = v.venue
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.employee_id = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5 AND fa.course_code != $6`,
      [slot_year, semester_type, employee_id, slot1.slot_day, slot1.slot_time, course_code]
    );

    if (faculty1ClashCheck.rows.length > 0) {
      const clash = faculty1ClashCheck.rows[0];
      return res.status(409).json({
        message: `Faculty clash: Faculty is already assigned to ${clash.course_name} in ${clash.venue_name} during ${lab_pair_1} time slot`,
        type: "faculty_clash_pair1",
        existingAllocation: clash,
      });
    }

    // 5. Check faculty conflicts for second lab pair
    const faculty2ClashCheck = await db.query(
      `SELECT fa.*, c.course_name, v.venue as venue_name
       FROM faculty_allocation fa
       JOIN course c ON fa.course_code = c.course_code
       JOIN venue v ON fa.venue = v.venue
       WHERE fa.slot_year = $1 AND fa.semester_type = $2 
       AND fa.employee_id = $3 AND fa.slot_day = $4 
       AND fa.slot_time = $5 AND fa.course_code != $6`,
      [slot_year, semester_type, employee_id, slot2.slot_day, slot2.slot_time, course_code]
    );

    if (faculty2ClashCheck.rows.length > 0) {
      const clash = faculty2ClashCheck.rows[0];
      return res.status(409).json({
        message: `Faculty clash: Faculty is already assigned to ${clash.course_name} in ${clash.venue_name} during ${lab_pair_2} time slot`,
        type: "faculty_clash_pair2",
        existingAllocation: clash,
      });
    }

    // Insert both allocations (simplified without transaction for now)
    try {
      // Insert first lab pair allocation
      const result1 = await db.query(
        `INSERT INTO faculty_allocation 
         (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          slot_year,
          semester_type,
          course_code,
          employee_id,
          venue_1,
          slot1.slot_day,
          lab_pair_1,
          slot1.slot_time,
        ]
      );

      // Insert second lab pair allocation
      const result2 = await db.query(
        `INSERT INTO faculty_allocation 
         (slot_year, semester_type, course_code, employee_id, venue, slot_day, slot_name, slot_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          slot_year,
          semester_type,
          course_code,
          employee_id,
          venue_2,
          slot2.slot_day,
          lab_pair_2,
          slot2.slot_time,
        ]
      );

      res.status(201).json({
        message: "P=4 lab allocation created successfully",
        allocations: [result1.rows[0], result2.rows[0]],
        labPairs: {
          pair1: lab_pair_1,
          pair2: lab_pair_2,
        },
      });

    } catch (insertError) {
      throw insertError;
    }

  } catch (error) {
    console.error("Create P=4 faculty allocation error:", error);
    res.status(500).json({
      message: "Server error while creating P=4 faculty allocation",
      error: error.message,
    });
  }
};
