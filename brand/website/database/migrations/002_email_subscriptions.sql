-- Email subscription system for Candlefish Workshop Notes
-- Version: 002
-- Created: 2025-08-24

-- Email subscribers table
CREATE TABLE email_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'pending')),
    subscription_type VARCHAR(50) DEFAULT 'workshop_notes' CHECK (subscription_type IN ('workshop_notes', 'all', 'insights')),
    preferences JSONB DEFAULT '{
        "frequency": "immediate",
        "format": "html",
        "categories": ["all"]
    }'::jsonb,
    source VARCHAR(100) DEFAULT 'website',
    confirmed_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    unsubscribe_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for email subscribers
CREATE INDEX idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX idx_email_subscribers_status ON email_subscribers(status);
CREATE INDEX idx_email_subscribers_subscription_type ON email_subscribers(subscription_type);
CREATE INDEX idx_email_subscribers_created_at ON email_subscribers(created_at);
CREATE INDEX idx_email_subscribers_unsubscribe_token ON email_subscribers(unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;
CREATE INDEX idx_email_subscribers_preferences_gin ON email_subscribers USING gin(preferences);

-- Workshop notes table for email content
CREATE TABLE workshop_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    author VARCHAR(255) DEFAULT 'Candlefish Atelier',
    category VARCHAR(100) DEFAULT 'architecture',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    published_at TIMESTAMP WITH TIME ZONE,
    is_published BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    recipient_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{
        "reading_time": 0,
        "complexity": "intermediate",
        "prerequisites": []
    }'::jsonb
);

-- Create indexes for workshop notes
CREATE INDEX idx_workshop_notes_slug ON workshop_notes(slug);
CREATE INDEX idx_workshop_notes_published ON workshop_notes(is_published, published_at);
CREATE INDEX idx_workshop_notes_email_sent ON workshop_notes(email_sent, email_sent_at);
CREATE INDEX idx_workshop_notes_category ON workshop_notes(category);
CREATE INDEX idx_workshop_notes_tags_gin ON workshop_notes USING gin(tags);

-- Email campaigns table for tracking sent emails
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_note_id UUID REFERENCES workshop_notes(id) ON DELETE CASCADE,
    subject VARCHAR(500) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    recipient_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    complained_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{
        "resend_campaign_id": null,
        "send_settings": {}
    }'::jsonb
);

-- Create indexes for email campaigns
CREATE INDEX idx_email_campaigns_workshop_note_id ON email_campaigns(workshop_note_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_sent_at ON email_campaigns(sent_at);
CREATE INDEX idx_email_campaigns_created_at ON email_campaigns(created_at);

-- Email events table for tracking individual email interactions
CREATE TABLE email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    subscriber_id UUID REFERENCES email_subscribers(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
    event_data JSONB DEFAULT '{}'::jsonb,
    resend_event_id VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for email events
CREATE INDEX idx_email_events_campaign_id ON email_events(campaign_id);
CREATE INDEX idx_email_events_subscriber_id ON email_events(subscriber_id);
CREATE INDEX idx_email_events_event_type ON email_events(event_type);
CREATE INDEX idx_email_events_created_at ON email_events(created_at);
CREATE INDEX idx_email_events_resend_id ON email_events(resend_event_id) WHERE resend_event_id IS NOT NULL;

-- Add updated_at triggers to new tables
CREATE TRIGGER update_email_subscribers_updated_at BEFORE UPDATE ON email_subscribers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshop_notes_updated_at BEFORE UPDATE ON workshop_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unsubscribe tokens
CREATE OR REPLACE FUNCTION generate_unsubscribe_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unsubscribe_token IS NULL THEN
        NEW.unsubscribe_token = encode(gen_random_bytes(32), 'base64url');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for generating unsubscribe tokens
CREATE TRIGGER generate_unsubscribe_token_trigger
    BEFORE INSERT ON email_subscribers
    FOR EACH ROW EXECUTE FUNCTION generate_unsubscribe_token();

-- Function to update email campaign statistics
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE email_campaigns 
        SET 
            sent_count = (SELECT COUNT(*) FROM email_events WHERE campaign_id = NEW.campaign_id AND event_type = 'sent'),
            delivered_count = (SELECT COUNT(*) FROM email_events WHERE campaign_id = NEW.campaign_id AND event_type = 'delivered'),
            opened_count = (SELECT COUNT(*) FROM email_events WHERE campaign_id = NEW.campaign_id AND event_type = 'opened'),
            clicked_count = (SELECT COUNT(*) FROM email_events WHERE campaign_id = NEW.campaign_id AND event_type = 'clicked'),
            bounced_count = (SELECT COUNT(*) FROM email_events WHERE campaign_id = NEW.campaign_id AND event_type = 'bounced'),
            complained_count = (SELECT COUNT(*) FROM email_events WHERE campaign_id = NEW.campaign_id AND event_type = 'complained')
        WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updating campaign statistics
CREATE TRIGGER update_campaign_stats_trigger
    AFTER INSERT ON email_events
    FOR EACH ROW EXECUTE FUNCTION update_campaign_stats();

-- Create materialized view for subscription analytics
CREATE MATERIALIZED VIEW email_subscription_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    subscription_type,
    status,
    COUNT(*) as subscriber_count,
    COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL) as confirmed_count
FROM email_subscribers
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), subscription_type, status
ORDER BY date DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_email_subscription_analytics_date_type_status 
ON email_subscription_analytics(date, subscription_type, status);

-- Insert sample workshop note (The Architecture of Inevitability)
INSERT INTO workshop_notes (
    slug, 
    title, 
    content, 
    summary, 
    category,
    tags,
    is_published,
    published_at,
    metadata
) VALUES (
    'architecture-of-inevitability',
    'The Architecture of Inevitability',
    'We publish when we discover something worth sharing. No content calendar. No SEO games. Just operational patterns.

This is the fundamental principle behind everything we create at Candlefish. Not because we''re contrarian, but because artificial scarcity breeds artificial thinking.

## The Constraint Creates the Form

When you remove the pressure to publish regularly, something interesting happens. You stop optimizing for the algorithm and start optimizing for insight. The work becomes more patient. More deliberate.

The architecture of inevitability isn''t about waiting for inspiration. It''s about creating conditions where meaningful patterns emerge naturally from the work itself.

## Operational Patterns vs. Content Strategy

Most organizations approach content as a marketing function. Create personas. Map customer journeys. Build editorial calendars. Generate volume.

We approach it as an operational function. What did we learn? What pattern did we discover? What assumption did we test?

The content emerges from the operations, not the other way around.

## The Economics of Attention

Traditional content marketing assumes attention is abundant and cheap. Create more content. Publish more frequently. Capture more eyeballs.

But attention is actually scarce and expensive. Especially the kind of attention that leads to meaningful business outcomes.

By publishing only when we have something worth sharing, we''re optimizing for the right kind of attention. The kind that builds relationships rather than consuming them.

## Implementation Notes

This principle extends beyond content into how we structure client engagements, internal research, and product development:

1. **Client Work**: We don''t propose solutions until we understand the operational patterns
2. **Research**: We don''t publish findings until they''ve been validated in practice
3. **Product**: We don''t ship features until they solve real operational problems

The architecture of inevitability is ultimately about alignment. When your communication strategy aligns with your operational reality, everything else becomes simpler.',
    'An exploration of why we publish when we discover something worth sharing, not according to predetermined schedules.',
    'architecture',
    ARRAY['strategy', 'operations', 'content', 'philosophy'],
    true,
    NOW(),
    '{
        "reading_time": 5,
        "complexity": "intermediate",
        "prerequisites": ["understanding of content marketing", "basic business operations"]
    }'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Update schema version
INSERT INTO schema_versions (version, description) VALUES 
(2, 'Email subscription system with workshop notes, campaigns, and analytics');

-- Grant permissions for new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON email_subscribers, workshop_notes, email_campaigns, email_events TO candlefish_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO candlefish_app;