export type ArticleCategory = 'seasonal' | 'breed' | 'symptom' | 'nutrition' | 'recall' | 'preventive' | 'emergency' | 'product';
export type ArticleSeverity = 'info' | 'warning' | 'critical';
export type Season = 'summer' | 'monsoon' | 'winter' | 'spring' | 'postMonsoon';

export interface PawNewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string; // markdown
  category: ArticleCategory;
  publishedAt: string; // ISO date
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  breeds?: string[]; // e.g., ['pug', 'labrador retriever']
  seasons?: Season[];
  severity: ArticleSeverity;
  readTimeMinutes: number;
  tags: string[];
}

export const pawNewsArticles: PawNewsArticle[] = [
  {
    id: 'pn-001',
    title: 'Monsoon Tick Fever: Prevention and Early Detection',
    summary: 'Rising humidity during monsoon season increases tick activity. Learn how to protect your dog with preventive measures and spot early warning signs.',
    content: `# Monsoon Tick Fever: Prevention and Early Detection

Monsoon season brings with it a spike in tick and flea populations, which can transmit serious diseases like tick fever, Lyme disease, and ehrlichiosis.

## Prevention Strategies

1. **Regular Tick Checks** – Inspect your dog after every walk, especially in grassy or wooded areas.
2. **Preventive Medications** – Use vet-recommended spot-on treatments or oral antiparasitics monthly.
3. **Environmental Control** – Keep bedding clean and vacuum regularly.
4. **Avoid High-Risk Areas** – Limit walks in areas with dense vegetation during peak monsoon.

## Early Warning Signs

- Lethargy and reluctance to move
- Fever (>103.5°F / 39.7°C)
- Loss of appetite
- Joint pain or limping
- Pale gums

## What to Do

Contact your veterinarian immediately if you suspect tick fever. Early antibiotic treatment can prevent complications.

**Disclaimer:** This information is for educational purposes. Always consult your veterinarian for diagnosis and treatment.`,
    category: 'seasonal',
    publishedAt: '2026-06-10T08:00:00Z',
    source: 'Indian Veterinary Association',
    sourceUrl: 'https://example.com/tick-fever',
    imageUrl: 'https://images.unsplash.com/photo-1601958149055-fb72b27e06b9?w=400&h=250&fit=crop',
    breeds: [],
    seasons: ['monsoon'],
    severity: 'warning',
    readTimeMinutes: 5,
    tags: ['tick', 'fever', 'monsoon', 'prevention']
  },
  {
    id: 'pn-002',
    title: 'Heatstroke in Pugs: A Critical Summer Guide',
    summary: 'Pugs are highly susceptible to heatstroke due to their flat snouts. Discover emergency protocols and prevention measures for summer.',
    content: `# Heatstroke in Pugs: A Critical Summer Guide

Brachycephalic breeds like Pugs, Bulldogs, and Shih Tzus are at extreme risk during summer months due to their compromised airways.

## Risk Factors

- High humidity combined with temperatures above 28°C
- Strenuous exercise during peak heat
- Inadequate water or shade
- Enclosed or poorly ventilated spaces

## Warning Signs (EMERGENCY)

- Excessive panting and drooling
- Bright red tongue and gums
- Lethargy or collapse
- Vomiting or diarrhea
- Confusion or disorientation

## Immediate Response

1. Move to a cool, shaded area
2. Offer water (don't force drink)
3. Apply cool (NOT cold) water to paws, ears, and underside
4. **Call your vet immediately** – this is a medical emergency

## Prevention

- Walk before 8 AM or after 7 PM
- Ensure constant shade and fresh water
- Avoid strenuous play during hot hours
- Never leave your pug in a car or hot room
- Keep coat well-groomed (do not shave completely)

**Disclaimer:** This is not a substitute for veterinary care. Heatstroke is life-threatening and requires immediate professional treatment.`,
    category: 'breed',
    publishedAt: '2026-06-12T10:30:00Z',
    source: 'AAHA (American Animal Hospital Association)',
    sourceUrl: 'https://example.com/pug-heatstroke',
    imageUrl: 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=400&h=250&fit=crop',
    breeds: ['pug', 'bulldog', 'shih tzu'],
    seasons: ['summer'],
    severity: 'critical',
    readTimeMinutes: 6,
    tags: ['heatstroke', 'emergency', 'pug', 'summer']
  },
  {
    id: 'pn-003',
    title: 'Essential Vaccination Schedule for Indian Dogs',
    summary: 'A complete guide to core and non-core vaccines tailored for India\'s climate and disease prevalence.',
    content: `# Essential Vaccination Schedule for Indian Dogs

Vaccinations are the cornerstone of preventive healthcare for dogs in India, where diseases like rabies, canine distemper, and parvovirus are endemic.

## Core Vaccines (Mandatory)

### DHPP (DPP + Leptospirosis)
- **When:** 6, 9, 12, and 16 weeks; booster at 1 year, then every 3 years
- **Protection:** Distemper, Parvovirus, Hepatitis, Parainfluenza, Leptospirosis
- **Why:** Essential for all dogs

### Rabies
- **When:** 12-16 weeks; booster at 1 year, then every 1-3 years (legal requirement in India)
- **Protection:** Rabies
- **Why:** Zoonotic disease; legally mandatory in India

## Non-Core Vaccines (Based on Lifestyle)

- **Lyme Disease:** Only if in endemic areas
- **Bordetella (Kennel Cough):** For dogs in boarding/training environments
- **Leptospirosis (Standalone):** Recommended in high-rainfall areas

## Vaccination Schedule

| Age | Vaccine |
|-----|---------|
| 6 weeks | DHPP #1 |
| 9 weeks | DHPP #2 |
| 12-16 weeks | DHPP #3 + Rabies |
| 12 months | DHPP + Rabies boosters |
| 3 years+ | DHPP booster every 3 years; Rabies per local law |

## Important Notes

- Follow your vet's recommendation; timelines may vary
- Maintain records for travel and legal compliance
- Discuss non-core vaccines with your veterinarian based on your dog's lifestyle

**Disclaimer:** This schedule is general guidance. Always follow your veterinarian's recommendations for your individual dog.`,
    category: 'preventive',
    publishedAt: '2026-06-08T14:00:00Z',
    source: 'WSAVA (World Small Animal Veterinary Association)',
    sourceUrl: 'https://example.com/vaccination-schedule',
    imageUrl: 'https://images.unsplash.com/photo-1590080876779-e80fcf6a1144?w=400&h=250&fit=crop',
    breeds: [],
    seasons: [],
    severity: 'info',
    readTimeMinutes: 7,
    tags: ['vaccination', 'preventive', 'health']
  },
  {
    id: 'pn-004',
    title: 'Toxic Foods for Dogs: Complete Safety List',
    summary: 'A comprehensive guide to foods and substances that are poisonous to dogs. Keep this handy for emergencies.',
    content: `# Toxic Foods for Dogs: Complete Safety List

Many common household foods and substances can cause serious harm to dogs. This list covers the most dangerous items.

## Highly Toxic

### Chocolate (Theobromine)
- **Symptoms:** Vomiting, diarrhea, restlessness, rapid heartbeat, seizures
- **Dark chocolate is most dangerous**

### Grapes and Raisins
- **Symptom:** Sudden kidney failure
- **Cause:** Unknown toxin; even small amounts can be dangerous

### Xylitol (Artificial Sweetener)
- **Found in:** Sugar-free gum, candy, baked goods
- **Symptoms:** Hypoglycemia, liver damage, death
- **EMERGENCY if ingested**

### Onions and Garlic
- **Active Ingredient:** Thiosulfate damages red blood cells
- **All forms toxic:** Raw, cooked, powdered

### Avocado
- **Toxin:** Persin
- **Symptoms:** Vomiting, diarrhea, pancreatitis

### Macadamia Nuts
- **Symptoms:** Weakness, tremors, hyperthermia
- **Even small amounts dangerous**

## Moderately Toxic

- Alcohol (all types)
- Caffeine (coffee, tea, energy drinks)
- Fatty foods (pancreatitis risk)
- Bones (splintering hazard)
- Raw dough (bloating risk)
- Citrus fruits (essential oils)

## What to Do If Ingested

1. **Call your vet immediately** or contact an emergency clinic
2. Note the **type and amount** of substance ingested
3. Note the **time of ingestion**
4. Do NOT induce vomiting unless instructed by a vet
5. Bring the product packaging to the vet

## Emergency Contacts

- **ASPCA Poison Control (US):** (888) 426-4435
- **Pet Poison Helpline:** (855) 764-7661
- **Local Emergency Vet Clinic:** [Find nearby]

**Disclaimer:** This is educational information. In case of suspected poisoning, contact your veterinarian or emergency clinic immediately.`,
    category: 'nutrition',
    publishedAt: '2026-06-05T09:00:00Z',
    source: 'ASPCA (American Society for the Prevention of Cruelty to Animals)',
    sourceUrl: 'https://example.com/toxic-foods',
    imageUrl: 'https://images.unsplash.com/photo-1599599810694-b08dcb85b734?w=400&h=250&fit=crop',
    breeds: [],
    seasons: [],
    severity: 'critical',
    readTimeMinutes: 8,
    tags: ['toxic', 'food', 'poison', 'emergency']
  },
  {
    id: 'pn-005',
    title: 'Labrador Retrievers: Breed-Specific Health Guide',
    summary: 'Everything Lab owners need to know about breed-specific health issues, exercise needs, and preventive care.',
    content: `# Labrador Retrievers: Breed-Specific Health Guide

Labradors are among the most popular dog breeds worldwide. Understanding their specific health needs ensures a long, healthy life.

## Common Health Issues

### Hip and Elbow Dysplasia
- **Symptoms:** Limping, reluctance to jump, joint stiffness
- **Prevention:** Maintain ideal body weight, appropriate exercise, screen parents for dysplasia
- **Age of Onset:** 4-10 years

### Obesity
- **Risk:** Labs love food! Overweight Labs develop diabetes, joint problems, and heart disease
- **Prevention:** Strict calorie control, measure portions, regular exercise
- **Ideal Weight:** 25-36 kg (varies by individual)

### Exercise-Induced Collapse (EIC)
- **Symptoms:** Sudden weakness/collapse after intense exercise
- **Management:** Avoid strenuous activity in hot weather, provide breaks
- **Genetic Test:** Available for screening

### Ear Infections
- **Cause:** Water retention from swimming; ear canal shape makes Labs prone
- **Prevention:** Clean ears regularly, dry after swimming
- **Warning Signs:** Head shaking, scratching, odor

## Exercise Requirements

- **Daily:** 60-90 minutes of vigorous exercise
- **Mental Stimulation:** Puzzle toys, training, retrieves
- **Swimming:** Excellent for joints and cooling (dry ears after!)
- **Avoid:** Intense exercise before/after meals

## Nutrition

- **High-quality kibble** with balanced proteins and fats
- **Portion control** – Labs overeat if given the chance
- **Age-appropriate diet:** Puppy, adult, senior formulations
- **Supplements:** Joint support (glucosamine) after age 5

## Regular Checkups

- Annual vet exams until age 7
- **Twice-yearly exams** from age 7 onward
- Hip/elbow scoring before breeding
- Eye health screening (CERF certification)

**Disclaimer:** This information is for general awareness. Consult your veterinarian for individual health recommendations.`,
    category: 'breed',
    publishedAt: '2026-06-07T11:00:00Z',
    source: 'Labrador Retriever Club',
    sourceUrl: 'https://example.com/labrador-health',
    imageUrl: 'https://images.unsplash.com/photo-1633722715463-d30628519e1a?w=400&h=250&fit=crop',
    breeds: ['labrador retriever'],
    seasons: [],
    severity: 'info',
    readTimeMinutes: 7,
    tags: ['labrador', 'breed', 'health', 'prevention']
  },
  {
    id: 'pn-006',
    title: 'Post-Monsoon Skin Allergies: Causes and Remedies',
    summary: 'After monsoon rains, dogs often develop itching and skin issues. Learn the causes and how to manage them.',
    content: `# Post-Monsoon Skin Allergies: Causes and Remedies

The post-monsoon period brings sudden humidity changes and increased mold/fungal spores, triggering skin allergies in many dogs.

## Why Post-Monsoon?

- **Humidity Levels:** Still high, promoting fungal growth
- **Fungal Spores:** Increased concentration in air and soil
- **Wet Bedding:** Moisture traps bacteria and fungi
- **Water Sources:** Stagnant water increases pathogen exposure

## Common Post-Monsoon Skin Issues

### Fungal Infections (Ringworm, Malassezia)
- **Symptoms:** Circular patches, itching, hair loss, musty odor
- **Contagious:** Yes, to other pets and humans
- **Duration:** 2-4 weeks with treatment

### Bacterial Infections (Pyoderma)
- **Symptoms:** Pustules, crusting, warmth, swelling
- **Cause:** Secondary to moisture and scratching
- **Requires:** Antibiotics from vet

### Moisture-Related Dermatitis
- **Symptoms:** Red, inflamed skin in skin folds
- **Areas Affected:** Paws, ears, tail base, groin
- **Management:** Keep dry, frequent drying after walks

## Treatment & Prevention

### Immediate Care
1. **Bathe regularly** with antifungal or medicated shampoo (2-3x/week for 2 weeks)
2. **Dry thoroughly** – use towels and blow dryer on cool setting
3. **Keep environment dry** – change bedding frequently
4. **Avoid wet areas** during walks if possible

### Ongoing Management
- Weekly medicated baths during high-risk season
- Probiotic supplements to strengthen skin barrier
- Omega-3 supplements (fish oil) for skin health
- Low-humidity indoor spaces

### When to Seek Vet Help
- Persistent itching despite home care
- Widespread or worsening lesions
- Fever or systemic symptoms
- Suspected contagion (ringworm)

**Disclaimer:** Skin issues require proper diagnosis. If home remedies don't improve symptoms within 1 week, consult your veterinarian.`,
    category: 'seasonal',
    publishedAt: '2026-06-06T13:30:00Z',
    source: 'Indian Dermatology Association for Animals',
    sourceUrl: 'https://example.com/post-monsoon-skin',
    imageUrl: 'https://images.unsplash.com/photo-1601958149055-fb72b27e06b9?w=400&h=250&fit=crop',
    breeds: [],
    seasons: ['postMonsoon'],
    severity: 'warning',
    readTimeMinutes: 6,
    tags: ['skin', 'allergy', 'monsoon', 'fungal']
  },
  {
    id: 'pn-007',
    title: 'Deworming Schedule: Complete Guide for Indian Dogs',
    summary: 'Regular deworming is critical in India. Learn the correct schedule, signs of worms, and recommended antiparasitics.',
    content: `# Deworming Schedule: Complete Guide for Indian Dogs

Intestinal parasites (worms) are common in Indian dogs. Regular deworming protects your dog and your family.

## Why Deworming Matters

- **High Prevalence:** Parasites are endemic in India's climate
- **Zoonotic Risk:** Some worms infect humans (especially children)
- **Impaired Growth:** Puppies with worms fail to thrive
- **Malnutrition:** Parasites reduce nutrient absorption

## Common Parasites in India

- **Roundworms:** Large, spaghetti-like worms
- **Hookworms:** Cause anemia and bloody stools
- **Tapeworms:** Transmitted by fleas and contaminated meat
- **Giardia:** Protozoan parasite causing severe diarrhea
- **Coccida:** Intestinal parasite affecting puppies

## Deworming Schedule

### Puppies
- 2 weeks old: First deworming
- Every 2 weeks until 8 weeks old
- Monthly from 2-6 months
- Then follow adult schedule

### Adult Dogs (1-7 years)
- **Every 3 months** (recommended in India due to high prevalence)
- Some vets recommend 6-monthly if minimal exposure

### Senior Dogs (7+ years)
- **Every 3-6 months**
- Watch for age-related complications

## Signs of Worm Infestation

- Visible worms in stool or vomit
- Diarrhea or constipation
- Pot-bellied appearance (especially puppies)
- Pale gums (anemia from hookworms)
- Dull coat and lethargy
- Scooting (dragging rear on ground)

## Recommended Antiparasitics

**Broad-spectrum (covers all worms):**
- Albendazole
- Levamisole
- Ivermectin (NOT for some breeds like Collies)

**Consult your vet** for the right dewormer and dosage based on your dog's weight and age.

## Prevention

- Regular cleaning of living spaces
- Proper waste disposal
- Avoid contaminated water/soil
- Flea control (prevents tapeworms)
- Good hygiene (wash hands after contact)

**Disclaimer:** Follow your veterinarian's deworming protocol. This is general information; individual dogs may have different needs.`,
    category: 'preventive',
    publishedAt: '2026-06-04T10:00:00Z',
    source: 'Companion Animal Parasite Council (CAPC)',
    sourceUrl: 'https://example.com/deworming',
    imageUrl: 'https://images.unsplash.com/photo-1587300411107-f655049b83e8?w=400&h=250&fit=crop',
    breeds: [],
    seasons: [],
    severity: 'warning',
    readTimeMinutes: 7,
    tags: ['deworming', 'parasites', 'preventive', 'health']
  },
  {
    id: 'pn-008',
    title: 'German Shepherds: Hip Dysplasia and Joint Care',
    summary: 'German Shepherds are prone to hip dysplasia. Understand prevention, management, and early detection strategies.',
    content: `# German Shepherds: Hip Dysplasia and Joint Care

Hip dysplasia is one of the most common genetic conditions in German Shepherds. Early detection and prevention can significantly improve quality of life.

## What Is Hip Dysplasia?

- **Definition:** Abnormal development of the hip joint, causing laxity and arthritis
- **Onset:** Can begin at 4 weeks; signs typically appear at 4-12 months
- **Progression:** Varies; some dogs remain mildly symptomatic; others develop severe arthritis

## Risk Factors

- **Genetics:** Hereditary condition (screened via OFA/PennHIP tests)
- **Growth Rate:** Rapid growth in large breeds accelerates dysplasia
- **Nutrition:** Excess calcium/calories during growth worsen condition
- **Exercise:** Inappropriate (e.g., jumping, running on hard surfaces) can trigger symptoms
- **Weight:** Obesity increases joint stress

## Early Warning Signs

- Difficulty rising after rest
- Reluctance to climb stairs or jump
- Bunny-hopping gait (rear legs moving together)
- Limping after exercise
- Stiffness in hindquarters

## Prevention (Puppy Stage)

1. **Screening:** Request OFA/PennHIP certification from breeder
2. **Controlled Growth:** Large-breed puppy food (lower calories, balanced calcium/phosphorus)
3. **Moderate Exercise:** 5 minutes per month of age (e.g., 10 minutes for 2-month puppy), avoid jumping
4. **Maintain Ideal Weight:** Avoid obesity (excess weight stresses joints)
5. **Joint Supplements:** Glucosamine, chondroitin, omega-3 from 4-6 weeks

## Management for Adults

### Pain Management
- NSAIDs (carprofen, meloxicam) as prescribed
- Supplements (glucosamine, green-lipped mussel)
- Laser therapy or acupuncture (adjunctive)

### Lifestyle Modifications
- Low-impact exercise (swimming, walking on soft surfaces)
- Ramps or steps to avoid jumping
- Orthopedic bedding
- Physical therapy

### Surgical Options
- **FHO (Femoral Head Ostectomy):** For severe cases
- **TPO (Triple Pelvic Osteotomy):** If caught early
- **Consult specialist** for candidacy

## Ongoing Monitoring

- Annual X-rays for progression
- Regular vet exams (twice yearly after age 5)
- Monitor for pain, mobility loss

**Disclaimer:** Hip dysplasia management should be done under veterinary supervision. Treatment varies based on severity and individual response.`,
    category: 'breed',
    publishedAt: '2026-06-03T09:00:00Z',
    source: 'German Shepherd Dog Club of America',
    sourceUrl: 'https://example.com/gsd-hips',
    imageUrl: 'https://images.unsplash.com/photo-1568393691622-d4895a4a4c2d?w=400&h=250&fit=crop',
    breeds: ['german shepherd'],
    seasons: [],
    severity: 'warning',
    readTimeMinutes: 8,
    tags: ['german shepherd', 'hip dysplasia', 'breed', 'joint']
  },
  {
    id: 'pn-009',
    title: 'Seizures in Dogs: Recognition and Emergency Response',
    summary: 'Learn to recognize seizures, understand common causes, and respond correctly during an emergency.',
    content: `# Seizures in Dogs: Recognition and Emergency Response

Seizures are frightening but not always immediately life-threatening. Knowing how to respond can save your dog's life.

## Types of Seizures

### Generalized (Grand Mal)
- Sudden loss of consciousness
- Violent muscle contractions
- Loss of bladder/bowel control
- Duration: 30 seconds to 2 minutes (rarely longer)

### Focal (Partial)
- Localized muscle twitches (one limb, face)
- Dog remains conscious
- Less dramatic than generalized

### Status Epilepticus (EMERGENCY)
- Multiple seizures without recovery between
- Or continuous seizure lasting >5 minutes
- **LIFE-THREATENING – seek emergency care immediately**

## During a Seizure

### DO:
- Stay **calm** (panic won't help)
- **Move away sharp objects** around your dog
- **Dim lights** and reduce noise if possible
- **Time the seizure** (crucial information for vet)
- **Protect the head** with soft cushions
- **Never put hands in the mouth** (myth: dogs cannot swallow tongue)
- Allow the seizure to finish naturally

### DON'T:
- Restrain the dog forcibly
- Try to give water or food
- Overhandle the dog
- Drive recklessly to emergency vet (unless status epilepticus)

## After a Seizure

- Dog will be disoriented ("post-ictal phase")
- Provide reassurance and a calm space
- Offer water after 10-15 minutes
- Document the incident (date, time, duration, triggers)

## Common Causes

- **Idiopathic Epilepsy:** No identifiable cause (genetic)
- **Toxin Exposure:** Chocolate, grapes, xylitol, tremorgenic plants
- **Metabolic:** Hypoglycemia, liver disease, kidney disease
- **Structural:** Brain tumor, trauma, stroke
- **Infections:** Meningitis, encephalitis

## Vet Workup

- Bloodwork and chemistry panel
- Possibly MRI or CT of brain
- CSF analysis if indicated
- EEG in some cases

## Long-Term Management

If diagnosed with epilepsy:
- Start anticonvulsant medication (phenobarbital, potassium bromide, levetiracetam)
- Regular blood monitoring for medication levels
- Maintain consistent feeding schedule
- Avoid known seizure triggers
- Keep a seizure diary

## When to Seek Emergency Care

- **First seizure ever** (need workup)
- **Seizures lasting >5 minutes**
- **Multiple seizures in 24 hours**
- **No recovery between seizures**
- **Difficulty breathing or unresponsiveness**

**Disclaimer:** Seizures require veterinary evaluation and management. This information is for emergency guidance only.`,
    category: 'emergency',
    publishedAt: '2026-06-02T12:00:00Z',
    source: 'Canine Epilepsy Foundation',
    sourceUrl: 'https://example.com/seizures',
    imageUrl: 'https://images.unsplash.com/photo-1587300411107-f655049b83e8?w=400&h=250&fit=crop',
    breeds: [],
    seasons: [],
    severity: 'critical',
    readTimeMinutes: 8,
    tags: ['seizures', 'emergency', 'neurological']
  },
  {
    id: 'pn-010',
    title: 'Nutritional Supplements for Dogs: Do They Really Work?',
    summary: 'An evidence-based guide to popular supplements: what works, what\'s overhyped, and what your dog actually needs.',
    content: `# Nutritional Supplements for Dogs: Do They Really Work?

The pet supplement market is booming, but which supplements are scientifically backed and which are marketing hype?

## Supplements with Strong Evidence

### Glucosamine and Chondroitin (Joint Health)
- **Evidence:** Moderate; helps some dogs with arthritis
- **Dose:** 15-20 mg/kg glucosamine daily
- **Best For:** Dogs with joint pain, large breeds, seniors
- **Cost-Benefit:** Reasonable if effective for your dog

### Omega-3 Fatty Acids (Fish Oil)
- **Evidence:** Strong; reduces inflammation, supports skin and coat
- **Dose:** 50-100 mg/kg EPA daily
- **Best For:** All dogs; especially those with allergies or joint issues
- **Cost-Benefit:** Excellent; widely recommended by vets

### Probiotics (Gut Health)
- **Evidence:** Growing; may help some digestive issues
- **Dose:** Strain-dependent; follow label
- **Best For:** Dogs with occasional diarrhea or after antibiotics
- **Cost-Benefit:** Moderate; mixed results in dogs

### Antioxidants (Vitamin E, Beta-Carotene)
- **Evidence:** Moderate; may slow cognitive decline in seniors
- **Dose:** Follow product recommendations
- **Best For:** Senior dogs; anti-aging purposes
- **Cost-Benefit:** Questionable unless dog shows signs of decline

## Supplements with Weak Evidence

### Turmeric/Curcumin
- **Claim:** Reduces inflammation
- **Reality:** Absorption in dogs is poor; most passes through unabsorbed
- **Verdict:** Probably not effective orally unless in bioavailable forms

### Collagen
- **Claim:** Improves skin and joint health
- **Reality:** Broken down in digestion; not clear if absorbed as collagen
- **Verdict:** Anecdotal evidence; not well-studied in dogs

### CBD (Cannabidiol)
- **Claim:** Reduces anxiety and pain
- **Reality:** Limited peer-reviewed studies; variable product quality
- **Verdict:** Emerging evidence; choose third-party tested products only

## Red Flags

- **Unsubstantiated claims** ("cures cancer," "miracle formula")
- **No quality testing** (unknown ingredients or fillers)
- **Exorbitant prices** (premium doesn't always mean better)
- **Celebrity endorsements** (not scientific evidence)

## Before Starting Supplements

1. **Consult your vet** – supplements can interact with medications
2. **Choose reputable brands** – look for third-party testing (USP, AAFCO)
3. **Start with high-need supplements** (omega-3, probiotics if indicated)
4. **Trial period:** Give 4-6 weeks to assess effectiveness
5. **Monitor:** Watch for side effects (GI upset, allergic reactions)

## Cost-Effective Approach

- **Prioritize:** Omega-3 (strongest evidence)
- **Consider:** Glucosamine for large/senior dogs with joint signs
- **Vet-guided:** Ask your vet about specific needs for your dog
- **Avoid:** Unnecessary supplements without clear indication

**Disclaimer:** This information is for educational purposes. Always consult your veterinarian before starting supplements, especially if your dog is on medications.`,
    category: 'nutrition',
    publishedAt: '2026-06-01T11:30:00Z',
    source: 'Veterinary Nutrition Society',
    sourceUrl: 'https://example.com/supplements',
    imageUrl: 'https://images.unsplash.com/photo-1587300411107-f655049b83e8?w=400&h=250&fit=crop',
    breeds: [],
    seasons: [],
    severity: 'info',
    readTimeMinutes: 9,
    tags: ['nutrition', 'supplements', 'health']
  },
  {
    id: 'pn-011',
    title: 'Summer Heat Safety: Walking Your Dog Safely',
    summary: 'High temperatures require careful planning. Learn safe walking times, surface temperatures, and dehydration prevention.',
    content: `# Summer Heat Safety: Walking Your Dog Safely

Summer heat is one of the biggest challenges for dog owners in India. Improper heat management can lead to heatstroke or burnt paws.

## Pavement Temperature Guide

| Air Temp | Pavement Temp | Safe? |
|----------|---------------|-------|
| 25°C | ~38°C | Yes (check with hand) |
| 28°C | ~45°C | NO – burns paws |
| 32°C | ~60°C | NO – serious burns |

**The Hand Test:** Hold your hand on the surface for 7 seconds. If you can't tolerate it, your dog's paws can't either.

## Safe Walking Schedule

- **Best Times:** 6-8 AM, 7-9 PM
- **Avoid:** 11 AM - 6 PM (peak heat)
- **Dark Surfaces:** Asphalt and concrete absorb heat; avoid entirely during peak hours

## Pre-Walk Preparation

- **Hydrate:** Offer water 30 minutes before the walk
- **Paw Protection:** Booties or paw balm on hot surfaces
- **Route:** Choose shaded paths, grass, or dirt when possible
- **Duration:** Shorten walks significantly during heat (30 min instead of 60 min)

## During the Walk

- **Carry Water:** Portable bowl and bottle for frequent breaks
- **Watch for Signs:** Excessive panting, drooling, lagging behavior
- **Limit Pace:** Slow walk, no running or strenuous play
- **Frequent Stops:** Rest in shade every 5-10 minutes

## Signs of Heat Exhaustion

- Heavy panting and drooling
- Bright red tongue/gums
- Reluctance to move
- Glazed eyes

## If Overheating Occurs

1. Move to shade immediately
2. Offer cool water (don't force drink)
3. Cool paws and ears with cool (not cold) water
4. Call vet if symptoms persist

## Alternative Exercises

During peak summer:
- **Swimming:** Excellent exercise and cools dog naturally
- **Indoor Activities:** Mental games, training, puzzle toys
- **Treadmill:** Controlled environment
- **Early Morning/Evening:** Plan longer outings for these times

## Special Precautions

- **Never leave dog in car** – even with windows down, car reaches deadly temps in minutes
- **Avoid Hot Beaches:** Burning sand is dangerous
- **Limit Exertion:** Save agility and intense play for cooler months
- **Hydration:** Offer water constantly

## Breeds at Higher Risk

- Brachycephalic breeds (Pug, Bulldog, Shih Tzu)
- Dogs with thick coats (Husky, German Shepherd)
- Overweight dogs
- Senior dogs
- Dogs with respiratory issues

**Disclaimer:** Heatstroke is a medical emergency. If your dog shows signs, seek veterinary care immediately.`,
    category: 'seasonal',
    publishedAt: '2026-05-31T08:00:00Z',
    source: 'AAHA (American Animal Hospital Association)',
    sourceUrl: 'https://example.com/summer-heat',
    imageUrl: 'https://images.unsplash.com/photo-1587300411107-f655049b83e8?w=400&h=250&fit=crop',
    breeds: [],
    seasons: ['summer'],
    severity: 'warning',
    readTimeMinutes: 7,
    tags: ['heat', 'safety', 'summer', 'paws']
  },
  {
    id: 'pn-012',
    title: 'Beagle Food Safety: Managing a Scavenger\'s Diet',
    summary: 'Beagles are notorious scavengers and counter surfers. Learn to manage their eating behavior and prevent obesity.',
    content: `# Beagle Food Safety: Managing a Scavenger's Diet

Beagles have an incredible sense of smell and an even more incredible appetite. Managing their food obsession is key to keeping them healthy.

## The Beagle Food Drive

- **Nose Rules:** Beagles hunt by smell, not sight
- **Motivation:** Can be food-motivated beyond other dog breeds
- **Problem:** Counter surfing, garbage raiding, overeating, obesity

## Obesity Risk

- **Prevalence:** 25-30% of Beagles are overweight
- **Health Consequences:** Joint problems, diabetes, short lifespan
- **Ideal Weight:** 10-15 kg (varies by individual)

## Managing the Food Drive

### Feeding Management
- **Scheduled Meals:** Feed 2-3 times daily, not free-fed
- **Measured Portions:** Use a measuring cup; count treats as calories
- **Crate Training:** Secure the dog during meal prep times
- **Elevated Food Bowls:** Reduce access to dropped food

### Home Environment
- **Secure Trash:** Use Beagle-proof containers
- **Clear Counters:** Remove temptations
- **Lock Pantry:** Beagles can open cabinets!
- **Keep Human Food Away:** No scraps, no matter how much they beg

### During Meals
- **Separate Feeding:** Feed in a closed room away from human food
- **Remove Bowl:** Take up bowl after 15 minutes
- **No Table Scraps:** Consistency is key

## Calorie Calculation

- **Maintenance:** Approximately 30-35 calories per kg of body weight
- **Example:** 12 kg Beagle needs ~400-420 calories/day
- **Treats:** Should be <10% of daily calories (40 calories max)
- **No Free Feeding:** Leads to rapid weight gain

## Healthy Treat Alternatives

- **Low-Calorie:** Carrots, green beans, apple slices (remove seeds)
- **Portion-Controlled:** Freeze-dried treats in small pieces
- **Kibble:** Use kibble as treats for training
- **Avoid:** All table scraps, high-fat treats, rawhides (choking hazard)

## Exercise Requirements

- **Daily:** 30-60 minutes of active exercise
- **Mental Stimulation:** Scent games, puzzle toys
- **Nose Work:** Hide treats or toys for them to find

## Warning Signs of Overfeeding

- Difficulty feeling ribs (should be easily palpable)
- No visible waist when viewed from above
- Reluctance to move or play
- Difficulty breathing or sleeping

## Weight Management Plan

1. **Baseline:** Record current weight and body condition
2. **Vet Consultation:** Discuss ideal weight and calorie targets
3. **Gradual Reduction:** Decrease calories by 10% if overweight
4. **Monthly Weigh-Ins:** Track progress
5. **Adjust:** Work with vet on sustainable plan

**Disclaimer:** Weight loss should be gradual and supervised by a veterinarian. Do not implement drastic calorie restrictions without professional guidance.`,
    category: 'breed',
    publishedAt: '2026-05-28T10:00:00Z',
    source: 'Beagle Club of America',
    sourceUrl: 'https://example.com/beagle-food',
    imageUrl: 'https://images.unsplash.com/photo-1587300411107-f655049b83e8?w=400&h=250&fit=crop',
    breeds: ['beagle'],
    seasons: [],
    severity: 'info',
    readTimeMinutes: 6,
    tags: ['beagle', 'nutrition', 'obesity', 'food safety']
  },
  {
    id: 'pn-013',
    title: 'Common Gastrointestinal Issues: Diarrhea and Vomiting',
    summary: 'When to worry about GI issues, home management strategies, and when to seek emergency veterinary care.',
    content: `# Common Gastrointestinal Issues: Diarrhea and Vomiting

Gastrointestinal upset is one of the most common reasons dogs visit the vet. Learn when to manage at home and when to seek help.

## When to Manage at Home

### Acute Diarrhea (< 24 hours)
- No blood or mucus
- Dog is otherwise active and normal appetite
- No fever
- Not a breed predisposed to serious issues

**Home Care:**
1. **Withhold Food:** 12-24 hours (offer water)
2. **Bland Diet:** Boiled chicken + rice, or prescription GI diet
3. **Probiotics:** Help restore healthy bacteria
4. **Monitor:** Return to normal diet gradually (3-5 days)

### Mild Vomiting (Single Episode)
- One-time vomiting, no repeat
- Alert and playful
- Able to drink water
- Likely dietary indiscretion

**Home Care:**
1. **Withhold Food:** 6-8 hours
2. **Offer Water:** Small, frequent amounts
3. **Return to Diet:** Bland foods for 2-3 days
4. **Monitor:** Watch for repeated vomiting

## When to Seek Veterinary Care IMMEDIATELY

### RED FLAGS (EMERGENCY)

- **Repeated Vomiting:** >2 episodes in 1 hour
- **Bloody Vomit:** (coffee-ground appearance or bright red)
- **Bloody Diarrhea:** Dark tarry stools or bright red blood
- **Abdominal Pain:** Hunched posture, whining, reluctance to move
- **Dehydration:** Dry gums, skin stays tented when pulled
- **Lethargy:** Not interested in food/play
- **Fever:** Temperature >103.5°F (39.7°C)
- **Known Toxin Ingestion:** Chocolate, grapes, xylitol, medications
- **Suspected Foreign Object:** String, toys, garbage
- **Bloating:** Distended hard abdomen, can't defecate/vomit

## Common Causes

### Dietary Indiscretion (Most Common)
- Garbage raiding, human food, spoiled food
- Self-limiting; resolves in 24-48 hours

### Gastroenteritis (Viral/Bacterial)
- Contagious (parvovirus, coronavirus, bacterial)
- Prolonged symptoms; may require hospitalization

### Food Allergies/Sensitivities
- Chronic or recurring diarrhea
- May include itching or ear infections
- Requires dietary trial (6-8 weeks) to confirm

### Parasites
- Especially in puppies and undewormed dogs
- Common culprits: roundworms, giardia, coccidia
- Require antiparasitic treatment

### Stress/Anxiety-Induced
- Related to changes, travel, boarding
- Usually self-limiting

### Serious Conditions
- Pancreatitis (history of fatty food)
- Blockage/foreign object
- Parvo (unvaccinated puppies)
- Toxin exposure

## Vet Workup

- Physical examination
- Bloodwork (CBC, chemistry panel)
- Fecal test (parasite, giardia antigen)
- Radiographs (X-ray) if blockage suspected
- Ultrasound if indicated

## Prevention

- **Quality Food:** High-quality kibble appropriate for age/size
- **Slow Transitions:** Change food over 5-7 days (mix old and new)
- **Avoid Scraps:** No table food, maintain discipline
- **Regular Deworming:** Every 3 months
- **Hydration:** Fresh water always available
- **Stress Management:** Maintain routine

## Duration and Recovery

- **Mild Cases:** 24-48 hours at home
- **Moderate Cases:** 3-5 days with vet care
- **Severe Cases:** May require hospitalization, IV fluids, medications

**Disclaimer:** Persistent or severe GI issues require veterinary evaluation. This information is for guidance on mild, acute cases only.`,
    category: 'symptom',
    publishedAt: '2026-05-25T14:00:00Z',
    source: 'American Veterinary Medical Association',
    sourceUrl: 'https://example.com/gi-issues',
    imageUrl: 'https://images.unsplash.com/photo-1587300411107-f655049b83e8?w=400&h=250&fit=crop',
    breeds: [],
    seasons: [],
    severity: 'warning',
    readTimeMinutes: 9,
    tags: ['diarrhea', 'vomiting', 'GI', 'health']
  },
  {
    id: 'pn-014',
    title: 'Husky Winter Care: More Than Just Cold Weather',
    summary: 'Huskies thrive in cold but still need special care. Learn about exercise, coat care, and health considerations.',
    content: `# Husky Winter Care: More Than Just Cold Weather

Huskies are built for cold climates, but winter brings its own set of challenges and care requirements beyond what you might expect.

## Cold Tolerance

- **Built For:** Temperatures as low as -50°C
- **Natural Adaptation:** Double coat insulates; paw pads have protective tissue
- **Exercise:** Actually enjoy winter more than other seasons
- **BUT:** Still vulnerable to issues like frostbite, salt damage, and hypothermia in extreme conditions

## Winter Exercise

- **Increased Activity:** Huskies LOVE cold weather; provide plenty of exercise
- **Controlled Environment:** Let them play in snow, but monitor for over-exertion
- **Hydration:** Just because it's cold doesn't mean they don't need water
- **High-Energy:** Without adequate winter exercise, destructive behavior increases
- **Indoor Supplement:** Puzzle toys and mental stimulation for extreme weather days

## Coat Care in Winter

- **Shedding:** Winter coat comes in; brush regularly (multiple times/week)
- **Matting:** Long double coat can mat when wet; dry after outdoor play
- **Ice Balls:** Snow clumps between paw pads; trim paw hair short
- **Never Shave:** Even in winter, don't shave – coat provides insulation and protection
- **Conditioning:** Bath less frequently (drys out skin) unless visibly dirty

## Paw Protection

### Salt and Chemicals
- **Damage:** Road salt and snow melt burn pads and cause irritation
- **Prevention:** Wash paws after winter walks with warm water
- **Booties:** Consider protective booties in heavily salted areas
- **Paw Balm:** Apply after washing for protection

### Frostbite Risk
- **Vulnerable Areas:** Ear tips, paw pads, tail tip
- **Signs:** Pale/blue skin turning red and swollen
- **Prevention:** Limit exposure during extreme cold (below -20°C)
- **Emergency:** Seek vet care if frostbite suspected

## Winter-Specific Health Issues

### Hypothermia
- **Risk:** Even cold-adapted dogs can hypothesize in extreme conditions
- **Signs:** Shivering, lethargy, confusion, weak pulse
- **Prevention:** Limit extreme cold exposure, provide shelter

### Dry Skin and Itching
- **Cause:** Low humidity and temperature fluctuations
- **Management:** Add omega-3 supplements, humidify home, less frequent baths
- **Signs:** Excessive scratching, flaking skin

### Increased Appetite
- **Reason:** Burning more calories in cold weather
- **Management:** May need 15-25% more calories in winter
- **Monitor:** Adjust to prevent weight loss

## Winter Nutrition

- **Calories:** Increase during cold months (for outdoor Huskies)
- **Fat Content:** Higher fat diet supports temperature regulation
- **Hydration:** Ensure fresh water doesn't freeze; offer multiple stations

## Winter Outdoor Considerations

- **Yard:** Provide shelter/windbreak for long-term outdoor time
- **Snow Depth:** Huskies love deep snow but verify it's not too deep for easy movement
- **Escaping:** Huskies are escape artists; secure fencing against snow drifts
- **Visibility:** Wear reflective gear or collar lights for visibility in low light

## When to Limit Winter Activity

- **Below -30°C:** Extreme cold; limit outdoor time
- **High Winds:** Wind chill equivalent matters more than actual temp
- **Ice Storms:** Dangerous conditions; traction and injury risk
- **Wet Coat:** Wet fur loses insulating properties; dry quickly

## Summer Challenges (Reverse of Winter)

- Heat intolerance is the main issue
- Exercise in early morning/evening only
- Never shave (coat provides UV and heat protection)
- Watch for overheating, especially in high humidity

## Seasonal Transition

- **Spring/Fall:** Extra shedding during coat changes
- **Grooming:** Increase brushing frequency
- **Adjust Exercise:** Gradually adapt to temperature changes

**Disclaimer:** Husky care should be tailored to your specific climate and individual dog. Consult your veterinarian about seasonal health needs.`,
    category: 'breed',
    publishedAt: '2026-05-20T09:30:00Z',
    source: 'Siberian Husky Club of America',
    sourceUrl: 'https://example.com/husky-winter',
    imageUrl: 'https://images.unsplash.com/photo-1587300411107-f655049b83e8?w=400&h=250&fit=crop',
    breeds: ['husky'],
    seasons: ['winter'],
    severity: 'info',
    readTimeMinutes: 9,
    tags: ['husky', 'winter', 'breed', 'seasonal']
  },
  {
    id: 'pn-015',
    title: 'Age-Related Changes: Recognizing Senior Dog Health Issues',
    summary: 'As dogs age, they develop new health needs. Learn to recognize senior-related changes and adapt care accordingly.',
    content: `# Age-Related Changes: Recognizing Senior Dog Health Issues

Dogs enter their senior years around age 7, though large breeds age faster. Understanding age-related changes helps you provide the best care.

## When Is a Dog a Senior?

| Size | Senior Age |
|------|-----------|
| Small (< 10 kg) | 10 years |
| Medium (10-25 kg) | 8 years |
| Large (25-40 kg) | 7 years |
| Giant (> 40 kg) | 5-6 years |

## Common Senior Health Changes

### Cognitive Decline (Canine Cognitive Dysfunction)
- **Signs:** Disorientation, house soiling, altered sleep-wake cycles
- **Management:** Maintain routine, mental stimulation, omega-3 supplements, medication if severe

### Joint Arthritis
- **Signs:** Stiffness, limping, difficulty rising, reluctance to jump
- **Management:** Glucosamine, joint supplements, pain management, low-impact exercise, ramps/steps

### Vision and Hearing Loss
- **Vision:** Cataracts, nuclear sclerosis (lens hardening)
- **Hearing:** Progressive age-related hearing loss (90% of senior dogs)
- **Management:** Keep furniture in place, speak louder/clearer, visual cues

### Urinary Incontinence
- **Common:** Especially in spayed females
- **Management:** More frequent bathroom breaks, medications (phenylpropanolamine), washable pads

### Dental Disease
- **Prevalence:** 80% of dogs over age 6 have dental issues
- **Prevention:** Regular cleanings, daily brushing, water additives
- **Consequences:** Infection, tooth loss, systemic disease

### Reduced Appetite
- **Causes:** Dental pain, digestive changes, medication side effects
- **Management:** Soften kibble, warm food, smaller more frequent meals, appetite stimulants if needed

### Weight Changes
- **Common:** Weight loss due to reduced appetite/absorption
- **Management:** Nutrient-dense diet, supplements, monitor closely

## Behavioral Changes

- **Sleep:** Sleep more but lighter, more nighttime restlessness
- **Sensitivity:** Lower tolerance for temperature extremes, loud noises
- **Anxiety:** May become more anxious or clingy (separation anxiety)
- **House Training:** Regression common due to incontinence or cognitive decline

## Health Monitoring for Seniors

### Veterinary Schedule
- **Ages 7-10:** Twice-yearly exams
- **10+:** Every 3-4 months or more if chronic conditions

### Baseline Testing
- Bloodwork (CBC, chemistry panel) at age 7
- Repeat yearly to monitor changes
- Early detection of kidney, liver, diabetes

### Dental Care
- Annual professional cleaning
- Daily home brushing if possible
- Extract diseased teeth to prevent systemic infection

## Home Modifications for Seniors

- **Ramps or Steps:** Access to furniture, vehicles, stairs
- **Non-Slip Flooring:** Rugs on slippery floors
- **Orthopedic Bedding:** Supportive, easy to get in/out
- **Elevated Food/Water:** Easier on neck and joints
- **Easy Access:** Bathroom area nearby
- **Temperature Control:** Maintain consistent, comfortable temperature

## Exercise for Seniors

- **Shorter, Frequent:** 20-30 min walks instead of one long walk
- **Low-Impact:** Swimming, flat surfaces, avoid jumping
- **Mental Stimulation:** Still important; adjust to abilities
- **Respect Limits:** Dog will self-limit if in pain; don't force
- **Warm-Up:** Gentle exercise before strenuous activity

## Nutrition Adjustments

- **Quality:** Senior formulas often have higher fiber, lower calories
- **Protein:** Maintain adequate protein (may need more, not less)
- **Supplements:** Glucosamine, omega-3, probiotics often beneficial
- **Frequent Meals:** 2-3 smaller meals vs. one large meal
- **Hydration:** Ensure water is easily accessible and fresh

## Medications and Supplements

- **Common:** Pain management (NSAIDs), cognitive support, supplements
- **Monitoring:** Regular blood work to ensure safety
- **Cost-Benefit:** Discuss with vet; quality of life is important

## Quality of Life Assessment

Ask yourself:
- Is my dog eating and drinking normally?
- Can they get comfortable and sleep?
- Do they have good pain control?
- Can they still enjoy activities they love?
- Are accidents/incontinence manageable?

If yes to most, your senior is likely happy. Discuss any concerns with your vet.

## End-of-Life Considerations

- **Hospice Care:** Some vets offer comfort-focused care
- **Euthanasia Planning:** Discuss options when dog's quality of life declines significantly
- **Grief Support:** Pet loss support groups available

**Disclaimer:** Senior dog care should be individualized. Work closely with your veterinarian to create a care plan for your aging companion.`,
    category: 'preventive',
    publishedAt: '2026-05-15T11:00:00Z',
    source: 'American Veterinary Medical Association',
    sourceUrl: 'https://example.com/senior-dogs',
    imageUrl: 'https://images.unsplash.com/photo-1587300411107-f655049b83e8?w=400&h=250&fit=crop',
    breeds: [],
    seasons: [],
    severity: 'info',
    readTimeMinutes: 12,
    tags: ['senior', 'aging', 'health', 'preventive']
  }
];

export default pawNewsArticles;
