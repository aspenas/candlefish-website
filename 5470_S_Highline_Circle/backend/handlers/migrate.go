package handlers

import (
	"github.com/gofiber/fiber/v2"
)

// RunMigration creates the activities table if it doesn't exist
func (h *Handler) RunMigration(c *fiber.Ctx) error {
	if h.db == nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database connection not available"})
	}

	// Create the activities table if it doesn't exist
	migration := `
	DO $$
	BEGIN
		-- Create activity_action enum if it doesn't exist
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_action') THEN
			CREATE TYPE activity_action AS ENUM (
				'viewed',
				'updated',
				'created',
				'deleted',
				'decided',
				'bulk_updated',
				'exported',
				'imported'
			);
		END IF;

		-- Create activities table if it doesn't exist
		IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activities') THEN
			CREATE TABLE activities (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				action activity_action NOT NULL,
				item_id UUID REFERENCES items(id) ON DELETE SET NULL,
				item_name VARCHAR(255),
				room_name VARCHAR(100),
				details TEXT,
				old_value VARCHAR(255),
				new_value VARCHAR(255),
				user_id VARCHAR(100),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- Create indexes for performance
			CREATE INDEX idx_activities_item ON activities(item_id);
			CREATE INDEX idx_activities_created ON activities(created_at DESC);
			CREATE INDEX idx_activities_action ON activities(action);
		END IF;
	END $$;
	`

	_, err := h.db.Exec(migration)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Insert initial activity
	_, err = h.db.Exec(`
		INSERT INTO activities (action, details, created_at)
		VALUES ('created', 'Activities table created and tracking enabled', CURRENT_TIMESTAMP)
		ON CONFLICT DO NOTHING
	`)
	if err != nil {
		// Ignore error as it might be duplicate
	}

	// Count activities to verify
	var count int
	err = h.db.QueryRow("SELECT COUNT(*) FROM activities").Scan(&count)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Migration completed successfully",
		"activities_count": count,
	})
}
