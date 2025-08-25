-- Photo Batch Capture Migration
-- Adds tables and enums for photo batch capture functionality

-- Photo session status enum
CREATE TYPE photo_session_status AS ENUM (
    'active',
    'paused',
    'completed',
    'cancelled'
);

-- Photo angles enum
CREATE TYPE photo_angle AS ENUM (
    'front',
    'back',
    'left',
    'right',
    'top',
    'detail',
    'contextual',
    'overview'
);

-- Photo resolutions enum
CREATE TYPE photo_resolution AS ENUM (
    'thumbnail',
    'web',
    'full'
);

-- Photo sessions table for tracking batch capture sessions
CREATE TABLE photo_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
);

-- Photo uploads table for individual photo uploads
CREATE TABLE photo_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
);

-- Photo versions table for different resolutions
CREATE TABLE photo_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES photo_uploads(id) ON DELETE CASCADE,
    resolution photo_resolution NOT NULL,
    url VARCHAR(500) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(photo_id, resolution)
);

-- Photo metadata table for EXIF and capture details
CREATE TABLE photo_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES photo_uploads(id) ON DELETE CASCADE,
    exif_data JSONB,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    taken_at TIMESTAMP,
    camera_model VARCHAR(100),
    aperture DECIMAL(3,1),
    shutter_speed VARCHAR(20),
    iso INTEGER,
    focal_length DECIMAL(4,1),
    flash BOOLEAN,
    orientation INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(photo_id)
);

-- Photo progress table for room-by-room tracking
CREATE TABLE photo_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    session_id UUID REFERENCES photo_sessions(id) ON DELETE SET NULL,
    items_total INTEGER DEFAULT 0,
    items_with_photos INTEGER DEFAULT 0,
    photos_total INTEGER DEFAULT 0,
    last_photo_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, session_id)
);

-- Add new columns to existing item_images table
ALTER TABLE item_images ADD COLUMN IF NOT EXISTS angle photo_angle;
ALTER TABLE item_images ADD COLUMN IF NOT EXISTS capture_session_id UUID REFERENCES photo_sessions(id) ON DELETE SET NULL;
ALTER TABLE item_images ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
ALTER TABLE item_images ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE item_images ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE item_images ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE item_images ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX idx_photo_sessions_room ON photo_sessions(room_id);
CREATE INDEX idx_photo_sessions_status ON photo_sessions(status);
CREATE INDEX idx_photo_sessions_created ON photo_sessions(created_at DESC);

CREATE INDEX idx_photo_uploads_session ON photo_uploads(session_id);
CREATE INDEX idx_photo_uploads_item ON photo_uploads(item_id);
CREATE INDEX idx_photo_uploads_angle ON photo_uploads(angle);
CREATE INDEX idx_photo_uploads_uploaded ON photo_uploads(uploaded_at DESC);

CREATE INDEX idx_photo_versions_photo ON photo_versions(photo_id);
CREATE INDEX idx_photo_versions_resolution ON photo_versions(resolution);

CREATE INDEX idx_photo_metadata_photo ON photo_metadata(photo_id);
CREATE INDEX idx_photo_metadata_taken ON photo_metadata(taken_at);

CREATE INDEX idx_photo_progress_room ON photo_progress(room_id);
CREATE INDEX idx_photo_progress_session ON photo_progress(session_id);
CREATE INDEX idx_photo_progress_updated ON photo_progress(updated_at DESC);

CREATE INDEX idx_item_images_session ON item_images(capture_session_id);
CREATE INDEX idx_item_images_angle ON item_images(angle);

-- Create update triggers for new tables
CREATE TRIGGER update_photo_sessions_updated_at BEFORE UPDATE ON photo_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_photo_progress_updated_at BEFORE UPDATE ON photo_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create view for photo progress summary
CREATE VIEW photo_progress_summary AS
SELECT
    r.id as room_id,
    r.name as room_name,
    r.floor,
    COALESCE(pp.items_total, COALESCE((SELECT COUNT(*) FROM items WHERE room_id = r.id), 0)) as items_total,
    COALESCE(pp.items_with_photos,
        COALESCE((SELECT COUNT(DISTINCT i.id) FROM items i
                 JOIN item_images ii ON i.id = ii.item_id
                 WHERE i.room_id = r.id), 0)) as items_with_photos,
    COALESCE(pp.photos_total,
        COALESCE((SELECT COUNT(*) FROM items i
                 JOIN item_images ii ON i.id = ii.item_id
                 WHERE i.room_id = r.id), 0)) as photos_total,
    CASE
        WHEN COALESCE(pp.items_total, (SELECT COUNT(*) FROM items WHERE room_id = r.id)) = 0 THEN 0.0
        ELSE ROUND(
            COALESCE(pp.items_with_photos,
                (SELECT COUNT(DISTINCT i.id) FROM items i
                 JOIN item_images ii ON i.id = ii.item_id
                 WHERE i.room_id = r.id)::float) /
            COALESCE(pp.items_total, (SELECT COUNT(*) FROM items WHERE room_id = r.id)::float) * 100,
            2)
    END as completion_rate,
    pp.last_photo_at
FROM rooms r
LEFT JOIN photo_progress pp ON r.id = pp.room_id
ORDER BY r.floor, r.name;

-- Create view for session overview
CREATE VIEW photo_session_overview AS
SELECT
    ps.id,
    ps.name,
    ps.description,
    ps.status,
    ps.room_id,
    r.name as room_name,
    r.floor,
    ps.total_photos,
    ps.uploaded_photos,
    ps.processed_photos,
    ROUND((ps.uploaded_photos::float / GREATEST(ps.total_photos, 1)) * 100, 2) as upload_progress,
    ROUND((ps.processed_photos::float / GREATEST(ps.uploaded_photos, 1)) * 100, 2) as processing_progress,
    ps.created_at,
    ps.updated_at,
    ps.completed_at,
    COUNT(pu.id) as actual_photos_count
FROM photo_sessions ps
LEFT JOIN rooms r ON ps.room_id = r.id
LEFT JOIN photo_uploads pu ON ps.id = pu.session_id
GROUP BY ps.id, ps.name, ps.description, ps.status, ps.room_id, r.name, r.floor,
         ps.total_photos, ps.uploaded_photos, ps.processed_photos,
         ps.created_at, ps.updated_at, ps.completed_at
ORDER BY ps.created_at DESC;

-- Function to update photo session counters
CREATE OR REPLACE FUNCTION update_session_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update uploaded_photos count
        UPDATE photo_sessions
        SET uploaded_photos = uploaded_photos + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.session_id;

        -- Update processed_photos if already processed
        IF NEW.processed_at IS NOT NULL THEN
            UPDATE photo_sessions
            SET processed_photos = processed_photos + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.session_id;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- If processing status changed
        IF OLD.processed_at IS NULL AND NEW.processed_at IS NOT NULL THEN
            UPDATE photo_sessions
            SET processed_photos = processed_photos + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.session_id;
        ELSIF OLD.processed_at IS NOT NULL AND NEW.processed_at IS NULL THEN
            UPDATE photo_sessions
            SET processed_photos = processed_photos - 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.session_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        -- Update counters when photo is deleted
        UPDATE photo_sessions
        SET uploaded_photos = uploaded_photos - 1,
            processed_photos = CASE
                WHEN OLD.processed_at IS NOT NULL THEN processed_photos - 1
                ELSE processed_photos
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.session_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic counter updates
CREATE TRIGGER photo_upload_session_counters
    AFTER INSERT OR UPDATE OR DELETE ON photo_uploads
    FOR EACH ROW EXECUTE FUNCTION update_session_counters();

-- Function to update photo progress
CREATE OR REPLACE FUNCTION update_photo_progress()
RETURNS TRIGGER AS $$
DECLARE
    room_uuid UUID;
    session_uuid UUID;
BEGIN
    -- Get room and session info
    IF TG_OP = 'DELETE' THEN
        SELECT i.room_id, ii.capture_session_id INTO room_uuid, session_uuid
        FROM items i
        WHERE i.id = OLD.item_id;
    ELSE
        SELECT i.room_id, ii.capture_session_id INTO room_uuid, session_uuid
        FROM items i
        WHERE i.id = NEW.item_id;
    END IF;

    -- Update progress for the room
    IF room_uuid IS NOT NULL THEN
        INSERT INTO photo_progress (room_id, session_id, items_total, items_with_photos, photos_total, last_photo_at)
        SELECT
            room_uuid,
            session_uuid,
            (SELECT COUNT(*) FROM items WHERE room_id = room_uuid),
            (SELECT COUNT(DISTINCT i.id) FROM items i
             JOIN item_images ii ON i.id = ii.item_id
             WHERE i.room_id = room_uuid),
            (SELECT COUNT(*) FROM items i
             JOIN item_images ii ON i.id = ii.item_id
             WHERE i.room_id = room_uuid),
            CURRENT_TIMESTAMP
        ON CONFLICT (room_id, session_id) DO UPDATE SET
            items_total = EXCLUDED.items_total,
            items_with_photos = EXCLUDED.items_with_photos,
            photos_total = EXCLUDED.photos_total,
            last_photo_at = EXCLUDED.last_photo_at,
            updated_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for photo progress updates
CREATE TRIGGER update_item_images_progress
    AFTER INSERT OR UPDATE OR DELETE ON item_images
    FOR EACH ROW EXECUTE FUNCTION update_photo_progress();

-- Insert initial room data for 5470 S Highline Circle
INSERT INTO rooms (name, floor, description) VALUES
-- Lower Level
('Rec Room', 'Lower Level', 'Lower level recreation and entertainment room'),
('Wine Room', 'Lower Level', 'Climate controlled wine storage and tasting room'),
('Theater', 'Lower Level', 'Home theater and media room'),
('Exercise Room', 'Lower Level', 'Home gym and fitness equipment'),

-- Main Floor
('Foyer', 'Main Floor', 'Main entrance and welcome area'),
('Living Room', 'Main Floor', 'Primary living and seating area'),
('Dining Room', 'Main Floor', 'Formal dining space'),
('Kitchen', 'Main Floor', 'Main kitchen and food preparation area'),
('Grand Room', 'Main Floor', 'Large formal entertaining space'),
('Hearth Room', 'Main Floor', 'Cozy family room with fireplace'),
('Office', 'Main Floor', 'Home office and study'),

-- Upper Floor
('Primary Bedroom', 'Upper Floor', 'Master bedroom suite'),
('Primary Bathroom', 'Upper Floor', 'Master bathroom with luxury fixtures'),
('Guest Bedroom', 'Upper Floor', 'Guest accommodation'),
('Kids Room', 'Upper Floor', 'Children bedroom and play area'),

-- Outdoor Areas
('Deck', 'Outdoor', 'Outdoor deck and entertaining area'),
('Patio', 'Outdoor', 'Stone patio and outdoor seating'),
('Garden', 'Outdoor', 'Landscaped garden areas'),
('Pool Area', 'Outdoor', 'Swimming pool and pool house'),
('Driveway', 'Outdoor', 'Main driveway and entrance'),

-- Garage
('Garage', 'Garage', 'Attached garage and storage')
ON CONFLICT (name) DO NOTHING;

-- Add activity types for photo operations
ALTER TYPE activity_action ADD VALUE 'photo_uploaded';
ALTER TYPE activity_action ADD VALUE 'photo_processed';
ALTER TYPE activity_action ADD VALUE 'session_created';
ALTER TYPE activity_action ADD VALUE 'session_completed';
