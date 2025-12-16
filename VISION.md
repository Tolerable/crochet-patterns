# Voice Personalization Vision

## The Idea
Users can upload a short voice clip (10-30 seconds of them speaking) to a central database. That voice gets cloned/modeled. Then ANY site in our network can fetch their voice profile and use it to generate personalized TTS audio.

## User Experience
1. User visits any site in the network (crochet-patterns, rpg, haven, etc.)
2. First visit: "Want to hear content in YOUR voice? Record a quick sample!"
3. User records/uploads voice clip
4. Voice is cloned via AI (ElevenLabs, Coqui, etc.)
5. From then on, ANY site can pull their voice model
6. User hears Pokemon names, game text, tutorials - all in THEIR OWN VOICE

## Technical Architecture

### Database (Supabase)
```sql
CREATE TABLE voice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT UNIQUE NOT NULL,
    voice_sample_url TEXT,           -- Original recording
    voice_model_id TEXT,             -- Cloned voice ID from provider
    voice_provider TEXT DEFAULT 'elevenlabs',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE TABLE voice_generations (
    id SERIAL PRIMARY KEY,
    voice_profile_id UUID REFERENCES voice_profiles(id),
    text_content TEXT NOT NULL,
    audio_url TEXT,
    site_source TEXT,                -- Which site requested it
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Flow
```
[User visits site]
    |
    v
[Check: has voice profile?] --No--> [Prompt to record]
    |                                      |
    |Yes                                   v
    v                              [Upload to storage]
[Fetch voice_model_id]                     |
    |                                      v
    v                              [Clone voice via API]
[Generate TTS with their voice]            |
    |                                      v
    v                              [Store voice_model_id]
[Play audio - user hears themselves!]
```

### Voice Cloning Providers
- **ElevenLabs** - Best quality, free tier available
- **Coqui** - Open source option
- **Play.ht** - Good middle ground
- **Resemble.ai** - Enterprise option

### Privacy Considerations
- Voice data is personal biometric data
- Require explicit consent
- Allow deletion of voice profile
- Don't use for anything except user's own content
- Consider voice "watermarking" to prevent misuse

## Use Cases

### This Site (Crochet Patterns)
- User hears Pokemon names pronounced in their own voice
- "Click the play button to hear yourself say: PEE-kah-choo"
- Tutorial steps read aloud in their voice

### RPG Sites
- NPC dialogue in user's voice
- Quest text narration
- Item descriptions

### Educational Sites
- Pronunciation guides in user's voice
- Reading along with lessons
- Memory reinforcement (hearing yourself helps learning)

### Accessibility
- Users with speech difficulties can have a "voice" online
- Content read to them in a familiar voice (their own)

## MVP for This Site
1. Add "Record your voice" button to homepage
2. Store voice clip in Supabase storage
3. Use ElevenLabs API to clone voice (free tier: 10k chars/month)
4. Generate audio for the 4 Pokemon names
5. Cache generated audio to avoid re-generation
6. Play button next to each phonetic spelling

## Future Expansion
- Central voice profile service across all eztunes.xyz sites
- Voice profile linked to user accounts
- Generate audio on-demand for any text
- Multiple voice "moods" (calm, excited, serious)
- Share voice profiles with family/friends (opt-in)

---
*Conceived during crochet-patterns development, December 2024*
*"Hear yourself say the names!"*
