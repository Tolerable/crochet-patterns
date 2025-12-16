# Voice Models

Processed voice models for personalized TTS.

## Structure

```
voices/
├── README.md
├── {user_id}/
│   ├── model_info.json    # Metadata
│   ├── sample.wav         # Original voice sample (converted)
│   └── test_clone.wav     # Test output to verify cloning
```

## Usage

To generate TTS with a user's cloned voice:

```python
from chatterbox.tts import ChatterboxTTS

model = ChatterboxTTS.from_pretrained(device="cuda")
audio = model.generate(
    "Text to speak",
    audio_prompt_path="voices/{user_id}/sample.wav"
)
```

## Caching

Voice models are cached in browser localStorage after first fetch:
- Cache key: `voice_{user_id}`
- Version tracked for updates

## Processing

Voice samples are processed by:
`C:\Users\wetwi\OneDrive\AI\voice-identity\processors\voice_processor.py`

1. Downloads from Supabase bucket
2. Converts webm → wav (ffmpeg)
3. Generates test audio via Chatterbox
4. Saves to this folder
5. Push to GitHub
6. Updates voice_profiles table with location
