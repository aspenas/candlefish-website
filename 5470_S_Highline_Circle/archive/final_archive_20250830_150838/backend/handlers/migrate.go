package handlers

import (
	"github.com/gofiber/fiber/v2"
)

// RunPhotoMigration creates the photo batch capture tables
func (h *Handler) RunPhotoMigration(c *fiber.Ctx) error {
	if h.db == nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database connection not available"})
	}

	// Create photo-related enums
	_, err := h.db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'photo_session_status') THEN
				CREATE TYPE photo_session_status AS ENUM ('active', 'paused', 'completed', 'cancelled');
			END IF;
		END $$;
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	_, err = h.db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'photo_angle') THEN
				CREATE TYPE photo_angle AS ENUM ('front', 'back', 'left', 'right', 'top', 'detail', 'contextual', 'overview');
			END IF;
		END $$;
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	_, err = h.db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'photo_resolution') THEN
				CREATE TYPE photo_resolution AS ENUM ('thumbnail', 'web', 'full');
			END IF;
		END $$;
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Create photo sessions table
	_, err = h.db.Exec(`
		CREATE TABLE IF NOT EXISTS photo_sessions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			status photo_session_status DEFAULT 'active',
			total_photos INTEGER DEFAULT 0,
			uploaded_photos INTEGER DEFAULT 0,
			processed_photos INTEGER DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			completed_at TIMESTAMP
		)
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Create photo uploads table
	_, err = h.db.Exec(`
		CREATE TABLE IF NOT EXISTS photo_uploads (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
			item_id UUID REFERENCES items(id) ON DELETE SET NULL,
			filename VARCHAR(255) NOT NULL,
			original_name VARCHAR(255) NOT NULL,
			mime_type VARCHAR(100) NOT NULL,
			file_size BIGINT NOT NULL,
			angle photo_angle,
			caption TEXT,
			is_primary BOOLEAN DEFAULT FALSE,
			uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			processed_at TIMESTAMP
		)
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Photo migration completed successfully",
	})
}

// RunMigration creates the activities table and collaboration tables if they don't exist
func (h *Handler) RunMigration(c *fiber.Ctx) error {
	if h.db == nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database connection not available"})
	}

	// Create the activities and collaboration tables if they don't exist
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

		-- Create collaboration enums if they don't exist
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interest_level') THEN
			CREATE TYPE interest_level AS ENUM (
				'high',
				'medium',
				'low',
				'none'
			);
		END IF;

		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bundle_status') THEN
			CREATE TYPE bundle_status AS ENUM (
				'draft',
				'proposed',
				'accepted',
				'rejected',
				'withdrawn'
			);
		END IF;

		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
			CREATE TYPE user_role AS ENUM (
				'owner',
				'buyer'
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

		-- Create collaboration tables if they don't exist
		IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item_notes') THEN
			CREATE TABLE item_notes (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				item_id UUID REFERENCES items(id) ON DELETE CASCADE,
				author user_role NOT NULL,
				note TEXT NOT NULL,
				is_private BOOLEAN DEFAULT FALSE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- Create indexes
			CREATE INDEX idx_item_notes_item ON item_notes(item_id);
			CREATE INDEX idx_item_notes_author ON item_notes(author);
			CREATE INDEX idx_item_notes_created ON item_notes(created_at DESC);
		END IF;

		IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'buyer_interests') THEN
			CREATE TABLE buyer_interests (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				item_id UUID REFERENCES items(id) ON DELETE CASCADE,
				interest_level interest_level NOT NULL DEFAULT 'none',
				max_price DECIMAL(10,2),
				notes TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(item_id)
			);

			-- Create indexes
			CREATE INDEX idx_buyer_interests_item ON buyer_interests(item_id);
			CREATE INDEX idx_buyer_interests_level ON buyer_interests(interest_level);
		END IF;

		IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bundle_proposals') THEN
			CREATE TABLE bundle_proposals (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				name VARCHAR(255) NOT NULL,
				proposed_by user_role NOT NULL,
				total_price DECIMAL(10,2),
				status bundle_status DEFAULT 'draft',
				notes TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- Create indexes
			CREATE INDEX idx_bundle_proposals_status ON bundle_proposals(status);
			CREATE INDEX idx_bundle_proposals_proposed_by ON bundle_proposals(proposed_by);
		END IF;

		IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bundle_items') THEN
			CREATE TABLE bundle_items (
				bundle_id UUID REFERENCES bundle_proposals(id) ON DELETE CASCADE,
				item_id UUID REFERENCES items(id) ON DELETE CASCADE,
				PRIMARY KEY (bundle_id, item_id)
			);

			-- Create indexes
			CREATE INDEX idx_bundle_items_bundle ON bundle_items(bundle_id);
			CREATE INDEX idx_bundle_items_item ON bundle_items(item_id);
		END IF;

		-- Create update trigger function if it doesn't exist
		IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
			CREATE OR REPLACE FUNCTION update_updated_at()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = CURRENT_TIMESTAMP;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		END IF;

		-- Create triggers for updated_at columns
		IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_item_notes_updated_at') THEN
			CREATE TRIGGER update_item_notes_updated_at BEFORE UPDATE ON item_notes
				FOR EACH ROW EXECUTE FUNCTION update_updated_at();
		END IF;

		IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_buyer_interests_updated_at') THEN
			CREATE TRIGGER update_buyer_interests_updated_at BEFORE UPDATE ON buyer_interests
				FOR EACH ROW EXECUTE FUNCTION update_updated_at();
		END IF;

		IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bundle_proposals_updated_at') THEN
			CREATE TRIGGER update_bundle_proposals_updated_at BEFORE UPDATE ON bundle_proposals
				FOR EACH ROW EXECUTE FUNCTION update_updated_at();
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
