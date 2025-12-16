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

### Three-Tier Architecture
```
[Browser Cache] ←→ [GitHub Repo] ←→ [Supabase DB]
   (hot)             (cold)          (metadata)
```

- **Browser (localStorage/IndexedDB)**: Hot cache, instant playback, zero network after first load
- **GitHub repo**: Cold storage, source of truth for voice models, free permanent hosting
- **Supabase bucket**: Intake queue only (temporary, deleted after processing)
- **voice_profiles table**: Metadata - tracks user email → voice model location in repo

### Caching Flow
1. User requests their voice model
2. Check localStorage first → **cache hit = instant, zero network**
3. Cache miss → fetch from GitHub repo once
4. Store in localStorage with version/etag
5. Periodic version check against GitHub
6. GitHub only hit on first load or version update
7. Works offline once cached

```javascript
// Pseudocode
async function getVoiceModel(email) {
    const cached = localStorage.getItem(`voice_${email}`);
    const cachedVersion = localStorage.getItem(`voice_${email}_version`);

    if (cached && cachedVersion === latestVersion) {
        return JSON.parse(cached);  // Instant, no network
    }

    // Cache miss - fetch from GitHub once
    const model = await fetch(`https://raw.githubusercontent.com/.../voices/${email}/model.json`);
    localStorage.setItem(`voice_${email}`, JSON.stringify(model));
    localStorage.setItem(`voice_${email}_version`, latestVersion);
    return model;
}
```

## Voice Wardrobe System

Users don't just have ONE voice - they have a **voice wardrobe**:

### Layers
1. **Base Voice**: Their cloned voice (default identity)
2. **Mood Variants**: Same voice, different styles (calm, excited, dramatic)
3. **Per-Site Overrides**: Different voice per site context
4. **Shared Voices**: Friends/family voices (with permission)
5. **Community Voices**: Opt-in public voices others can use

### Data Model
```javascript
voice_preferences: {
    user_email: "gloop@email.com",
    default_voice: "gloop_base",
    site_overrides: {
        "rpg.eztunes.xyz": "gloop_dramatic",
        "crochet-patterns": "friend_sarah_calm",
        "games": "community_hype_announcer"
    },
    shared_with: ["friend@email.com"],  // Who can use my voice
    using_voices: ["sarah@email.com"]   // Whose voices I'm using
}
```

### Use Cases
- **RPG**: Deeper, dramatic version for quest narration
- **Crochet**: Calm, instructional tone for pattern reading
- **Games**: Excited, energetic for announcements
- **Learning**: Your own voice reinforces memory
- **Accessibility**: Familiar voice for those with reading difficulties

### Voice Sharing Flow
1. User A enables "share my voice" in settings
2. User B requests to use User A's voice
3. User A approves (or auto-approve for friends list)
4. User B can now select User A's voice for any site
5. Both users' preferences stored, voice model shared

## Future Expansion
- Central voice profile service across all eztunes.xyz sites
- Voice profile linked to user accounts
- Generate audio on-demand for any text
- Multiple voice "moods" (calm, excited, serious)
- Share voice profiles with family/friends (opt-in)
- Voice marketplace - premium/celebrity voices

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

## Implementation TODO

### Phase 1: Core (DONE)
- [x] Voice recording UI (no signup required)
- [x] localStorage for instant local playback
- [x] Signup flow to save permanently
- [x] Upload to Supabase bucket (intake queue)
- [x] voice_profiles table for tracking

### Phase 2: Processing Pipeline
- [x] Chatterbox integration - `audio_prompt_path` param clones any voice
- [ ] Store voice model in GitHub repo `/voices/{user_id}/`
- [ ] Delete raw audio from Supabase bucket after processing
- [ ] Update voice_profiles with model location and status='ready'

**Chatterbox Usage (KNOW THIS):**
```python
from chatterbox.tts import ChatterboxTTS
model = ChatterboxTTS.from_pretrained(device="cuda")
audio = model.generate(text, audio_prompt_path="/path/to/sample.wav")
```
Processor: `C:\Users\wetwi\OneDrive\AI\voice-identity\processors\voice_processor.py`

### Phase 3: Playback System
- [x] Voice model caching in localStorage/IndexedDB
- [x] Playback buttons next to phonetic spellings
- [x] Falls back to browser TTS if no personalized voice
- [ ] Version checking against GitHub (for cache invalidation)

### Phase 4: Voice Wardrobe
- [ ] voice_preferences table for per-site overrides
- [ ] Settings UI for managing voice preferences
- [ ] Voice sharing permissions system
- [ ] Community voices opt-in

### Phase 5: Network Expansion
- [ ] Integrate voice system into other eztunes sites
- [ ] Central voice identity service/API
- [ ] Cross-site voice preference sync

---
*Conceived during crochet-patterns development, December 2024*
*"Hear yourself say the names!"*
*"Your voice, everywhere."*
