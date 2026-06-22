class EyeScanAIEngine:
    def analyze(self, b64_string: str):
        return {
            "predicted_class": "cataracts",
            "confidence_score": 0.89,
            "triage_level": "Yellow (Non-urgent)",
            "reason_text": "Cataracts identified. Recommend consulting a vet ophthalmologist.",
            "gradcam_url": "data:image/jpeg;base64,dummy_gradcam_base64",
            "disclaimer": "This is an AI estimate and does not replace professional veterinary diagnosis."
        }

eye_service = EyeScanAIEngine()
