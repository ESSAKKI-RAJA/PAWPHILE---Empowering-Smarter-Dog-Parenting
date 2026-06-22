export interface CareGuide {
  id: string;
  title: string;
  organization: 'ASPCA' | 'AKC' | 'VCA' | 'Blue Cross' | string;
  category: string;
  description: string;
  pdfUrl: string; // Acts as the destination URL
}

export const CARE_GUIDES: CareGuide[] = [
  {
    id: "aspca-toxic-foods",
    title: "People Foods to Avoid Feeding Your Pets",
    organization: "ASPCA",
    category: "Toxicology",
    description: "An authoritative guide to human foods that are toxic or dangerous to dogs, detailing risk mechanisms.",
    pdfUrl: "https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets"
  },
  {
    id: "aspca-toxic-plants",
    title: "Toxic and Non-Toxic Plants List",
    organization: "ASPCA",
    category: "Toxicology",
    description: "Comprehensive database of garden and household plants that pose poison hazards to canines.",
    pdfUrl: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants"
  },
  {
    id: "aspca-general-care",
    title: "General Dog Care Guidelines",
    organization: "ASPCA",
    category: "General Care",
    description: "ASPCA's baseline recommendations for dog nutrition, grooming, health, and clean environment.",
    pdfUrl: "https://www.aspca.org/pet-care/dog-care/general-dog-care"
  },
  {
    id: "aspca-flea-tick",
    title: "Flea & Tick Prevention Essentials",
    organization: "ASPCA",
    category: "Parasites",
    description: "Expert advice on diagnosing, treating, and preventing flea and tick infestations in households.",
    pdfUrl: "https://www.aspca.org/pet-care/general-pet-care/fleas-and-ticks"
  },
  {
    id: "akc-puppy-socialization",
    title: "Introducing Puppies to the World (Socialization)",
    organization: "AKC",
    category: "Behavior & Training",
    description: "Critical timelines and steps for socialising young puppies to prevent fear and aggression issues.",
    pdfUrl: "https://www.akc.org/expert-advice/training/puppy-socialization/"
  },
  {
    id: "akc-house-train",
    title: "How to House Train a Puppy",
    organization: "AKC",
    category: "Behavior & Training",
    description: "A step-by-step guide to crate training and positive reinforcement schedules for housebreaking.",
    pdfUrl: "https://www.akc.org/expert-advice/training/how-to-house-train-a-puppy/"
  },
  {
    id: "akc-dog-nutrition",
    title: "Dog Nutrition & Diet 101",
    organization: "AKC",
    category: "Nutrition",
    description: "AKC's expert guidelines on parsing dog food labels, nutrient profiles, and raw/dry feeds.",
    pdfUrl: "https://www.akc.org/expert-advice/nutrition/dog-nutrition-diet/"
  },
  {
    id: "akc-parvovirus",
    title: "Parvovirus in Dogs: Prevention & Symptoms",
    organization: "AKC",
    category: "Health & Disease",
    description: "Vital information on recognizing, treating, and vaccinating against highly infectious canine Parvovirus.",
    pdfUrl: "https://www.akc.org/expert-advice/health/parvovirus-in-dogs/"
  },
  {
    id: "vca-hip-dysplasia",
    title: "Hip Dysplasia in Dogs",
    organization: "VCA",
    category: "Orthopedics",
    description: "Detailed clinical overview of hip dysplasia symptoms, diagnostic protocols, and treatment plans.",
    pdfUrl: "https://vcahospitals.com/know-your-pet/hip-dysplasia-in-dogs"
  },
  {
    id: "vca-ear-infection",
    title: "Ear Infections (Otitis Externa)",
    organization: "VCA",
    category: "Health & Disease",
    description: "Causes, diagnosis, and treatment protocols for chronic or acute bacterial and yeast ear infections.",
    pdfUrl: "https://vcahospitals.com/know-your-pet/ear-infections-in-dogs-otitis-externa"
  },
  {
    id: "vca-first-aid",
    title: "First Aid for Dogs",
    organization: "VCA",
    category: "Emergency Care",
    description: "Essential first-aid instructions for bleeding, fractures, shock, and heat exposure before reaching ER.",
    pdfUrl: "https://vcahospitals.com/know-your-pet/first-aid-for-dogs"
  },
  {
    id: "vca-preventive-checklist",
    title: "Preventive Healthcare for Dogs Checklist",
    organization: "VCA",
    category: "General Care",
    description: "VCA clinical guidelines outlining standard schedules for vaccinations, dental work, and physical exams.",
    pdfUrl: "https://vcahospitals.com/know-your-pet/preventive-healthcare-for-dogs"
  },
  {
    id: "bluecross-heatstroke",
    title: "Heatstroke in Dogs: Warning Signs & First Aid",
    organization: "Blue Cross",
    category: "Emergency Care",
    description: "How to identify heat exhaustion and step-by-step instructions for cooling a dog down safely.",
    pdfUrl: "https://www.bluecross.org.uk/advice/dog/heatstroke-in-dogs"
  },
  {
    id: "bluecross-grooming",
    title: "Grooming Your Dog: Basic Guide",
    organization: "Blue Cross",
    category: "General Care",
    description: "Step-by-step grooming instructions covering coat types, bathing, nail clipping, and skin checks.",
    pdfUrl: "https://www.bluecross.org.uk/advice/dog/grooming-your-dog"
  },
  {
    id: "bluecross-exercise",
    title: "Keeping Your Dog Fit and Healthy",
    organization: "Blue Cross",
    category: "Nutrition",
    description: "Guidelines for breed-appropriate daily exercise needs, weight checks, and calorie management.",
    pdfUrl: "https://www.bluecross.org.uk/advice/dog/keeping-your-dog-fit-and-healthy"
  }
];

export default CARE_GUIDES;
