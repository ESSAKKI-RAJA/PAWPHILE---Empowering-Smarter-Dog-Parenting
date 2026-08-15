# PAWPHILE CV Clinical Skin Ontology

This ontology strictly separates visual evidence from clinical diagnoses. The Computer Vision model is trained exclusively on **Level 1** and **Level 2** (Visual Evidence). **Level 3** and **Level 4** (Condition & Triage) are downstream heuristics derived from the visual findings and evaluated by the PAW AI Safety layer.

## LEVEL 1: BODY REGION
The anatomical location of the image, required for spatial context.
- `face`
- `ear` (pinna / canal)
- `periocular` (around the eye)
- `paw`
- `interdigital` (between toes)
- `abdomen`
- `limb`
- `back`
- `tail`
- `perineal`
- `general skin`

## LEVEL 2: VISUAL FINDING (CV TARGETS)
The physical lesions or signs visible in the pixels. **These are the only valid labels for CV training**.
- `erythema` (redness)
- `alopecia` (hair loss)
- `crust` (scabs)
- `scaling` (flakes/dandruff)
- `pustule` (pus-filled bumps)
- `papule` (solid bumps)
- `erosion` (shallow skin loss)
- `ulcer` (deep open sore)
- `lichenification` (thickened, leathery skin)
- `swelling`
- `mass` (tumor/growth)
- `discoloration` (hyperpigmentation)

## LEVEL 3: CLINICAL CONDITION (HEURISTIC INFERENCE)
Possible diseases that *may* be associated with the visual findings. 
> [!CAUTION]
> The CV system must **never** output these as definitive diagnoses. They must always be marked as `"status": "research_association"`.

- `bacterial dermatosis`
- `fungal infection` (e.g., ringworm)
- `hypersensitivity dermatitis` (allergies)
- `demodicosis` (mange)
- `flea allergy dermatitis`
- `healthy`

## LEVEL 4: URGENCY / TRIAGE
The safety-oriented veterinary recommendation.
> [!IMPORTANT]
> The CV model does NOT make triage decisions. This is handled by the upstream PAW AI Safety engine based on the CV findings combined with the dog's medical history.

- `routine veterinary evaluation`
- `prompt veterinary evaluation` (within days)
- `urgent veterinary evaluation` (within 24 hours)
- `emergency concern` (immediate action)
