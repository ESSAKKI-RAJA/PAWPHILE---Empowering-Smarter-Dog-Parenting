from enum import Enum

class TriageLevel(str, Enum):
    GREEN = "Green (monitor at home)"
    ORANGE = "Orange (vet within 24 hours)"
    RED = "Red (go to vet now)"
    EMERGENCY = "Emergency (immediate care)"

DISCLAIMER = "This is a risk signal, not a diagnosis — consult a licensed veterinarian."

def get_triage_for_skin(class_name: str, confidence: float) -> dict:
    """
    VetPriority™: Map skin disease class to Triage Level.
    """
    if class_name == "healthy skin":
        level = TriageLevel.GREEN
        reason = "Skin appears healthy. Monitor for any changes."
    elif class_name in ["bacterial dermatosis", "fungal infection"]:
        level = TriageLevel.ORANGE
        reason = f"Detected possible {class_name}. Can spread and cause discomfort. Schedule a vet visit within a day or two."
    elif class_name == "hypersensitivity/allergic dermatitis":
        level = TriageLevel.ORANGE
        reason = "Signs of allergic dermatitis. Very itchy for the dog. Seek veterinary care to relieve symptoms."
    elif class_name == "mange":
        level = TriageLevel.RED
        reason = "Possible mange detected. Highly contagious and severe itching. Go to the vet promptly."
    elif class_name == "hot spots":
        level = TriageLevel.RED
        reason = "Hot spots spread rapidly and are extremely painful. Go to the vet now for immediate topical treatment."
    else:
        level = TriageLevel.ORANGE
        reason = "Abnormal skin condition detected. Vet consultation recommended."
        
    return {
        "triage_level": level,
        "reason": reason,
        "disclaimer": DISCLAIMER
    }
