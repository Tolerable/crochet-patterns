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

## MVP for This Site (IMPLEMENTED)
1. Record button - no signup required to record/playback
2. Audio stored in localStorage for instant local playback
3. "Save My Voice" signup appears after recording
4. On signup: uploads to Supabase bucket (temporary)
5. Chatterbox processes sample, creates voice model
6. Raw audio deleted from bucket, model stored in repo
7. User identified by email for cross-site voice access

## Storage Strategy
- **localStorage**: Temporary playback on same browser (free, instant)
- **Supabase bucket**: Intake queue for processing (temporary)
- **GitHub repo**: Final voice models after Chatterbox processing (permanent, free)
- **voice_profiles table**: Tracks user email -> voice model location

## Future Expansion
- Central voice profile service across all eztunes.xyz sites
- Voice profile linked to user accounts
- Generate audio on-demand for any text
- Multiple voice "moods" (calm, excited, serious)
- Share voice profiles with family/friends (opt-in)

## The Bigger Picture: User-Owned Voice Identity

This is potentially a first - **User-Owned Voice Identity** as a service layer:

1. User submits voice sample on ANY site in the network
2. Chatterbox clones their voice ONCE
3. Voice model is stored and linked to their identity
4. EVERY site in the network can now use their voice

**Use cases across the network:**
- **RPG sites**: Quest text, NPC dialogue, item descriptions - all in YOUR voice
- **Crochet patterns**: Pronunciation guides, tutorial narration
- **Music sites**: Track announcements, playlist intros
- **Educational**: Learning content reinforced by hearing yourself
- **Games**: In-game narration, character voices

**Why this matters:**
- No one else is doing cross-site voice personalization
- Users own their voice identity
- One recording = infinite personalized experiences
- Builds loyalty - "my voice is in this ecosystem"

**Potential as standalone service:**
- API for other developers to tap into
- "Add voice personalization to your site in 5 minutes"
- Users bring their voice profile with them

---
*Conceived during crochet-patterns development, December 2024*
*"Hear yourself say the names!"*
*"Your voice, everywhere."*
