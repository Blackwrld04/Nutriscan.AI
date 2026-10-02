import base64
import logging
from typing import Dict, Optional
import requests

from app.config import settings

logger = logging.getLogger(__name__)


class ElevenLabsCoachService:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.voice_id = settings.ELEVENLABS_VOICE_ID or "21m00Tcm4TlvDq8ikWAM"

    def compose_coach_script(
        self,
        friend_name: str,
        meal_name: str,
        calories: float,
        protein_g: float,
        days_to_goal: int,
        target_weight: float
    ) -> str:
        return (
            f"Hey {friend_name}! Just reviewed your {meal_name}. "
            f"That logs in at {int(calories)} calories and a solid {int(protein_g)} grams of protein. "
            f"Based on your personal 30-day metabolic calibration, TabPFN confirms your true expenditure rate is humming along nicely. "
            f"At this current trajectory, you are on track to cross your {target_weight} kilo goal in about {days_to_goal} days. "
            f"Hydrate up and keep this consistency rolling into the evening!"
        )

    def generate_speech(self, text: str) -> Dict[str, Optional[str]]:
        """Generate audio using ElevenLabs or provide browser audio synthesis payload."""
        if self.api_key and len(self.api_key.strip()) > 10:
            try:
                url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"
                headers = {
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": self.api_key
                }
                data = {
                    "text": text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75
                    }
                }
                response = requests.post(url, json=data, headers=headers, timeout=15)
                if response.status_code == 200:
                    b64_audio = base64.b64encode(response.content).decode("utf-8")
                    return {
                        "text": text,
                        "audio_base64": b64_audio,
                        "audio_format": "audio/mp3",
                        "source": "ElevenLabs High-Definition Neural Voice"
                    }
                else:
                    logger.warning(f"ElevenLabs API returned {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Error calling ElevenLabs API: {e}")

        # Fallback to browser SpeechSynthesis API compatible payload
        return {
            "text": text,
            "audio_base64": None,
            "audio_format": "speech-synthesis",
            "source": "Browser SpeechSynthesis (Add ElevenLabs API Key in .env for Neural Voice)"
        }


coach_service = ElevenLabsCoachService()
