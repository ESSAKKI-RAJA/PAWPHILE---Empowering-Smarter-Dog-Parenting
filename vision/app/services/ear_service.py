class EarSenseAIEngine:
    def analyze(self, b64_string: str):
        return {
            "predicted_class": "ear infection (otitis externa)",
            "confidence_score": 0.94,
            "triage_level": "Orange (Urgent)",
            "reason_text": "High likelihood of ear infection. Painful for the pet. See vet soon.",
            "gradcam_url": "data:image/jpeg;base64,dummy_gradcam_base64",
            "disclaimer": "This is an AI estimate and does not replace professional veterinary diagnosis."
        }

ear_service = EarSenseAIEngine()
