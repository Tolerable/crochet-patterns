-- Voice Profiles for personalized TTS
-- Users can upload voice samples and have content read in their own voice

CREATE TABLE IF NOT EXISTS voice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    voice_sample_url TEXT,           -- URL to uploaded voice sample in storage
    voice_model_id TEXT,             -- Cloned voice ID from provider (future)
    voice_provider TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending',   -- pending, processing, ready, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Allow anonymous inserts (users submit their voice)
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous voice profile inserts" ON voice_profiles
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow users to view their own profile by email
CREATE POLICY "Allow viewing own voice profile" ON voice_profiles
    FOR SELECT TO anon
    USING (true);

-- Index for quick email lookups
CREATE INDEX IF NOT EXISTS idx_voice_profiles_email ON voice_profiles(user_email);
