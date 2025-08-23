package handlers

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/patricksmith/highline-inventory/models"
)

// Notes endpoints

func (h *Handler) GetItemNotes(c *fiber.Ctx) error {
	itemID := c.Params("id")
	userRole := c.Query("role", "buyer") // Default to buyer view

	if h.db == nil {
		return c.JSON(fiber.Map{
			"notes": []fiber.Map{
				{
					"id":         "1",
					"author":     "owner",
					"note":       "This piece is from West Elm, excellent condition",
					"is_private": false,
					"created_at": time.Now().Add(-2 * time.Hour),
				},
				{
					"id":         "2",
					"author":     "buyer",
					"note":       "Would you accept $800 for this?",
					"is_private": false,
					"created_at": time.Now().Add(-1 * time.Hour),
				},
			},
			"total": 2,
		})
	}

	// Parse UUID
	itemUUID, err := uuid.Parse(itemID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid item ID"})
	}

	// Build query based on user role
	query := `
		SELECT n.id, n.author, n.note, n.is_private, n.created_at, n.updated_at
		FROM item_notes n
		WHERE n.item_id = $1
	`

	// Filter private notes for buyers
	if userRole == "buyer" {
		query += " AND n.is_private = false"
	}

	query += " ORDER BY n.created_at ASC"

	rows, err := h.db.Query(query, itemUUID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	notes := []fiber.Map{}
	for rows.Next() {
		var note struct {
			ID        string    `db:"id"`
			Author    string    `db:"author"`
			Note      string    `db:"note"`
			IsPrivate bool      `db:"is_private"`
			CreatedAt time.Time `db:"created_at"`
			UpdatedAt time.Time `db:"updated_at"`
		}

		err := rows.Scan(&note.ID, &note.Author, &note.Note, &note.IsPrivate,
			&note.CreatedAt, &note.UpdatedAt)
		if err != nil {
			continue
		}

		notes = append(notes, fiber.Map{
			"id":         note.ID,
			"author":     note.Author,
			"note":       note.Note,
			"is_private": note.IsPrivate,
			"created_at": note.CreatedAt,
			"updated_at": note.UpdatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"notes": notes,
		"total": len(notes),
	})
}

func (h *Handler) AddItemNote(c *fiber.Ctx) error {
	itemID := c.Params("id")
	userRole := c.Query("role", "buyer")

	if h.db == nil {
		return c.JSON(fiber.Map{
			"success": true,
			"note": fiber.Map{
				"id":         "new-note-1",
				"author":     userRole,
				"note":       "Mock note added",
				"is_private": false,
				"created_at": time.Now(),
			},
		})
	}

	// Parse UUID
	itemUUID, err := uuid.Parse(itemID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid item ID"})
	}

	// Parse request body
	var req models.NoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Insert note
	var noteID uuid.UUID
	err = h.db.QueryRow(`
		INSERT INTO item_notes (item_id, author, note, is_private)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, itemUUID, userRole, req.Note, req.IsPrivate).Scan(&noteID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Log activity
	details := fmt.Sprintf("Note added by %s", userRole)
	h.logItemActivity(models.ActivityUpdated, itemUUID, &details, nil, nil)

	return c.JSON(fiber.Map{
		"success": true,
		"note": fiber.Map{
			"id":         noteID.String(),
			"author":     userRole,
			"note":       req.Note,
			"is_private": req.IsPrivate,
			"created_at": time.Now(),
		},
	})
}

func (h *Handler) UpdateNote(c *fiber.Ctx) error {
	noteID := c.Params("id")
	userRole := c.Query("role", "buyer")

	if h.db == nil {
		return c.JSON(fiber.Map{"success": true})
	}

	// Parse UUID
	noteUUID, err := uuid.Parse(noteID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid note ID"})
	}

	// Parse request body
	var req models.NoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Update note (only allow author to update their own notes)
	result, err := h.db.Exec(`
		UPDATE item_notes
		SET note = $1, is_private = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND author = $4
	`, req.Note, req.IsPrivate, noteUUID, userRole)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Note not found or not authorized"})
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) DeleteNote(c *fiber.Ctx) error {
	noteID := c.Params("id")
	userRole := c.Query("role", "buyer")

	if h.db == nil {
		return c.JSON(fiber.Map{"success": true})
	}

	// Parse UUID
	noteUUID, err := uuid.Parse(noteID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid note ID"})
	}

	// Delete note (only allow author to delete their own notes)
	result, err := h.db.Exec(`
		DELETE FROM item_notes
		WHERE id = $1 AND author = $2
	`, noteUUID, userRole)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Note not found or not authorized"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// Buyer interest endpoints

func (h *Handler) GetItemInterest(c *fiber.Ctx) error {
	itemID := c.Params("id")

	if h.db == nil {
		return c.JSON(fiber.Map{
			"interest": fiber.Map{
				"interest_level": "high",
				"max_price":      1200.00,
				"notes":          "Very interested, would like to see in person",
				"created_at":     time.Now().Add(-24 * time.Hour),
			},
		})
	}

	// Parse UUID
	itemUUID, err := uuid.Parse(itemID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid item ID"})
	}

	// Get buyer interest
	var interest struct {
		InterestLevel string     `db:"interest_level"`
		MaxPrice      *float64   `db:"max_price"`
		Notes         *string    `db:"notes"`
		CreatedAt     time.Time  `db:"created_at"`
		UpdatedAt     time.Time  `db:"updated_at"`
	}

	err = h.db.Get(&interest, `
		SELECT interest_level, max_price, notes, created_at, updated_at
		FROM buyer_interests
		WHERE item_id = $1
	`, itemUUID)

	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(fiber.Map{
				"interest": fiber.Map{
					"interest_level": "none",
				},
			})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"interest": fiber.Map{
			"interest_level": interest.InterestLevel,
			"max_price":      interest.MaxPrice,
			"notes":          interest.Notes,
			"created_at":     interest.CreatedAt,
			"updated_at":     interest.UpdatedAt,
		},
	})
}

func (h *Handler) SetItemInterest(c *fiber.Ctx) error {
	itemID := c.Params("id")

	if h.db == nil {
		return c.JSON(fiber.Map{"success": true})
	}

	// Parse UUID
	itemUUID, err := uuid.Parse(itemID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid item ID"})
	}

	// Parse request body
	var req models.InterestRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Upsert buyer interest
	_, err = h.db.Exec(`
		INSERT INTO buyer_interests (item_id, interest_level, max_price, notes)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (item_id) DO UPDATE SET
			interest_level = $2,
			max_price = $3,
			notes = $4,
			updated_at = CURRENT_TIMESTAMP
	`, itemUUID, req.InterestLevel, req.MaxPrice, req.Notes)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Log activity
	details := fmt.Sprintf("Buyer interest set to %s", req.InterestLevel)
	h.logItemActivity(models.ActivityUpdated, itemUUID, &details, nil, nil)

	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) GetBuyerInterests(c *fiber.Ctx) error {
	if h.db == nil {
		return c.JSON(fiber.Map{
			"interests": []fiber.Map{
				{
					"item_id":        "1",
					"item_name":      "Leather Sofa",
					"room":           "Living Room",
					"asking_price":   1500.00,
					"interest_level": "high",
					"max_price":      1200.00,
					"notes":          "Love this piece!",
				},
			},
			"total": 1,
		})
	}

	// Get all buyer interests with item details
	query := `
		SELECT
			bi.item_id, i.name as item_name, r.name as room_name,
			i.asking_price, bi.interest_level, bi.max_price, bi.notes,
			bi.created_at, bi.updated_at
		FROM buyer_interests bi
		JOIN items i ON bi.item_id = i.id
		JOIN rooms r ON i.room_id = r.id
		WHERE bi.interest_level != 'none'
		ORDER BY
			CASE
				WHEN bi.interest_level = 'high' THEN 1
				WHEN bi.interest_level = 'medium' THEN 2
				WHEN bi.interest_level = 'low' THEN 3
			END,
			bi.updated_at DESC
	`

	rows, err := h.db.Query(query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	interests := []fiber.Map{}
	for rows.Next() {
		var interest struct {
			ItemID        string     `db:"item_id"`
			ItemName      string     `db:"item_name"`
			RoomName      string     `db:"room_name"`
			AskingPrice   *float64   `db:"asking_price"`
			InterestLevel string     `db:"interest_level"`
			MaxPrice      *float64   `db:"max_price"`
			Notes         *string    `db:"notes"`
			CreatedAt     time.Time  `db:"created_at"`
			UpdatedAt     time.Time  `db:"updated_at"`
		}

		err := rows.Scan(&interest.ItemID, &interest.ItemName, &interest.RoomName,
			&interest.AskingPrice, &interest.InterestLevel, &interest.MaxPrice,
			&interest.Notes, &interest.CreatedAt, &interest.UpdatedAt)
		if err != nil {
			continue
		}

		interests = append(interests, fiber.Map{
			"item_id":        interest.ItemID,
			"item_name":      interest.ItemName,
			"room":           interest.RoomName,
			"asking_price":   interest.AskingPrice,
			"interest_level": interest.InterestLevel,
			"max_price":      interest.MaxPrice,
			"notes":          interest.Notes,
			"created_at":     interest.CreatedAt,
			"updated_at":     interest.UpdatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"interests": interests,
		"total":     len(interests),
	})
}

// Bundle endpoints

func (h *Handler) GetBundles(c *fiber.Ctx) error {
	if h.db == nil {
		return c.JSON(fiber.Map{
			"bundles": []fiber.Map{
				{
					"id":          "1",
					"name":        "Living Room Set",
					"proposed_by": "owner",
					"total_price": 3500.00,
					"status":      "proposed",
					"item_count":  3,
					"created_at":  time.Now().Add(-24 * time.Hour),
				},
			},
			"total": 1,
		})
	}

	query := `
		SELECT
			bp.id, bp.name, bp.proposed_by, bp.total_price, bp.status,
			bp.notes, bp.created_at, bp.updated_at,
			COUNT(bi.item_id) as item_count
		FROM bundle_proposals bp
		LEFT JOIN bundle_items bi ON bp.id = bi.bundle_id
		GROUP BY bp.id, bp.name, bp.proposed_by, bp.total_price, bp.status,
		         bp.notes, bp.created_at, bp.updated_at
		ORDER BY bp.updated_at DESC
	`

	rows, err := h.db.Query(query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	bundles := []fiber.Map{}
	for rows.Next() {
		var bundle struct {
			ID          string     `db:"id"`
			Name        string     `db:"name"`
			ProposedBy  string     `db:"proposed_by"`
			TotalPrice  *float64   `db:"total_price"`
			Status      string     `db:"status"`
			Notes       *string    `db:"notes"`
			CreatedAt   time.Time  `db:"created_at"`
			UpdatedAt   time.Time  `db:"updated_at"`
			ItemCount   int        `db:"item_count"`
		}

		err := rows.Scan(&bundle.ID, &bundle.Name, &bundle.ProposedBy,
			&bundle.TotalPrice, &bundle.Status, &bundle.Notes,
			&bundle.CreatedAt, &bundle.UpdatedAt, &bundle.ItemCount)
		if err != nil {
			continue
		}

		bundles = append(bundles, fiber.Map{
			"id":          bundle.ID,
			"name":        bundle.Name,
			"proposed_by": bundle.ProposedBy,
			"total_price": bundle.TotalPrice,
			"status":      bundle.Status,
			"notes":       bundle.Notes,
			"item_count":  bundle.ItemCount,
			"created_at":  bundle.CreatedAt,
			"updated_at":  bundle.UpdatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"bundles": bundles,
		"total":   len(bundles),
	})
}

func (h *Handler) CreateBundle(c *fiber.Ctx) error {
	userRole := c.Query("role", "buyer")

	if h.db == nil {
		return c.JSON(fiber.Map{
			"success": true,
			"bundle": fiber.Map{
				"id":          "new-bundle-1",
				"name":        "Test Bundle",
				"proposed_by": userRole,
				"status":      "draft",
				"created_at":  time.Now(),
			},
		})
	}

	// Parse request body
	var req models.BundleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Start transaction
	tx, err := h.db.Beginx()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer tx.Rollback()

	// Insert bundle proposal
	var bundleID uuid.UUID
	err = tx.QueryRow(`
		INSERT INTO bundle_proposals (name, proposed_by, total_price, notes)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, req.Name, userRole, req.TotalPrice, req.Notes).Scan(&bundleID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Insert bundle items
	for _, itemID := range req.ItemIDs {
		_, err = tx.Exec(`
			INSERT INTO bundle_items (bundle_id, item_id)
			VALUES ($1, $2)
		`, bundleID, itemID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Log activity
	details := fmt.Sprintf("Bundle '%s' created with %d items", req.Name, len(req.ItemIDs))
	h.logActivity(models.ActivityCreated, nil, nil, nil, &details, nil, nil, nil)

	return c.JSON(fiber.Map{
		"success": true,
		"bundle": fiber.Map{
			"id":          bundleID.String(),
			"name":        req.Name,
			"proposed_by": userRole,
			"total_price": req.TotalPrice,
			"status":      "draft",
			"item_count":  len(req.ItemIDs),
			"created_at":  time.Now(),
		},
	})
}

func (h *Handler) UpdateBundle(c *fiber.Ctx) error {
	bundleID := c.Params("id")

	if h.db == nil {
		return c.JSON(fiber.Map{"success": true})
	}

	// Parse UUID
	bundleUUID, err := uuid.Parse(bundleID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid bundle ID"})
	}

	// Parse request body
	var req models.BundleUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Build update query dynamically
	setParts := []string{}
	args := []interface{}{}
	argIndex := 0

	if req.Status != nil {
		argIndex++
		setParts = append(setParts, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *req.Status)
	}

	if req.TotalPrice != nil {
		argIndex++
		setParts = append(setParts, fmt.Sprintf("total_price = $%d", argIndex))
		args = append(args, *req.TotalPrice)
	}

	if req.Notes != nil {
		argIndex++
		setParts = append(setParts, fmt.Sprintf("notes = $%d", argIndex))
		args = append(args, *req.Notes)
	}

	if len(setParts) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No fields to update"})
	}

	// Add updated_at
	argIndex++
	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())

	// Add bundle ID for WHERE clause
	argIndex++
	args = append(args, bundleUUID)

	query := fmt.Sprintf(`
		UPDATE bundle_proposals
		SET %s
		WHERE id = $%d
	`, strings.Join(setParts, ", "), argIndex)

	result, err := h.db.Exec(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Bundle not found"})
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) DeleteBundle(c *fiber.Ctx) error {
	bundleID := c.Params("id")

	if h.db == nil {
		return c.JSON(fiber.Map{"success": true})
	}

	// Parse UUID
	bundleUUID, err := uuid.Parse(bundleID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid bundle ID"})
	}

	// Delete bundle (cascade will handle bundle_items)
	result, err := h.db.Exec(`
		DELETE FROM bundle_proposals
		WHERE id = $1
	`, bundleUUID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Bundle not found"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// Collaboration overview

func (h *Handler) GetCollaborationOverview(c *fiber.Ctx) error {
	if h.db == nil {
		return c.JSON(fiber.Map{
			"summary": fiber.Map{
				"total_items_for_sale": 45,
				"items_with_interest":  12,
				"high_interest":        5,
				"medium_interest":      4,
				"low_interest":         3,
				"active_bundles":       2,
				"total_notes":          28,
			},
			"recent_activity": []fiber.Map{
				{
					"type":       "interest",
					"item_name":  "Vintage Coffee Table",
					"level":      "high",
					"created_at": time.Now().Add(-2 * time.Hour),
				},
				{
					"type":       "note",
					"item_name":  "Leather Sofa",
					"author":     "buyer",
					"created_at": time.Now().Add(-4 * time.Hour),
				},
			},
		})
	}

	// Get summary statistics
	var summary struct {
		TotalItemsForSale int `db:"total_items_for_sale"`
		ItemsWithInterest int `db:"items_with_interest"`
		HighInterest      int `db:"high_interest"`
		MediumInterest    int `db:"medium_interest"`
		LowInterest       int `db:"low_interest"`
		ActiveBundles     int `db:"active_bundles"`
		TotalNotes        int `db:"total_notes"`
	}

	err := h.db.Get(&summary, `
		SELECT
			(SELECT COUNT(*) FROM items WHERE decision = 'Sell') as total_items_for_sale,
			(SELECT COUNT(*) FROM buyer_interests WHERE interest_level != 'none') as items_with_interest,
			(SELECT COUNT(*) FROM buyer_interests WHERE interest_level = 'high') as high_interest,
			(SELECT COUNT(*) FROM buyer_interests WHERE interest_level = 'medium') as medium_interest,
			(SELECT COUNT(*) FROM buyer_interests WHERE interest_level = 'low') as low_interest,
			(SELECT COUNT(*) FROM bundle_proposals WHERE status IN ('draft', 'proposed')) as active_bundles,
			(SELECT COUNT(*) FROM item_notes) as total_notes
	`)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Get recent activity (last 50 activities)
	activityQuery := `
		(SELECT 'interest' as type, i.name as item_name, bi.interest_level as level,
		        NULL as author, bi.updated_at as created_at
		 FROM buyer_interests bi
		 JOIN items i ON bi.item_id = i.id
		 WHERE bi.interest_level != 'none'
		 ORDER BY bi.updated_at DESC
		 LIMIT 25)
		UNION ALL
		(SELECT 'note' as type, i.name as item_name, NULL as level,
		        n.author, n.created_at
		 FROM item_notes n
		 JOIN items i ON n.item_id = i.id
		 ORDER BY n.created_at DESC
		 LIMIT 25)
		ORDER BY created_at DESC
		LIMIT 10
	`

	rows, err := h.db.Query(activityQuery)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	recentActivity := []fiber.Map{}
	for rows.Next() {
		var activity struct {
			Type      string     `db:"type"`
			ItemName  string     `db:"item_name"`
			Level     *string    `db:"level"`
			Author    *string    `db:"author"`
			CreatedAt time.Time  `db:"created_at"`
		}

		err := rows.Scan(&activity.Type, &activity.ItemName, &activity.Level,
			&activity.Author, &activity.CreatedAt)
		if err != nil {
			continue
		}

		activityMap := fiber.Map{
			"type":       activity.Type,
			"item_name":  activity.ItemName,
			"created_at": activity.CreatedAt,
		}

		if activity.Level != nil {
			activityMap["level"] = *activity.Level
		}

		if activity.Author != nil {
			activityMap["author"] = *activity.Author
		}

		recentActivity = append(recentActivity, activityMap)
	}

	return c.JSON(fiber.Map{
		"summary": fiber.Map{
			"total_items_for_sale": summary.TotalItemsForSale,
			"items_with_interest":  summary.ItemsWithInterest,
			"high_interest":        summary.HighInterest,
			"medium_interest":      summary.MediumInterest,
			"low_interest":         summary.LowInterest,
			"active_bundles":       summary.ActiveBundles,
			"total_notes":          summary.TotalNotes,
		},
		"recent_activity": recentActivity,
	})
}
