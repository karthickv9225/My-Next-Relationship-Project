export type AttributeKey =
  | 'gender'
  | 'age'
  | 'height'
  | 'name'
  | 'personality'
  | 'hobby'
  | 'profession';

export type FilterPhase = 'idle' | 'rolling' | 'revealed';

export interface AttributeMeta {
  key: AttributeKey;
  label: string;
}

export type PredictionResult = Record<AttributeKey, string>;

export const ATTRIBUTE_SEQUENCE: AttributeMeta[] = [
  { key: 'gender', label: 'Gender' },
  { key: 'age', label: 'Age' },
  { key: 'height', label: 'Height' },
  { key: 'name', label: 'Name' },
  { key: 'personality', label: 'Personality' },
  { key: 'hobby', label: 'Hobby' },
  { key: 'profession', label: 'Profession' },
];

const GENDERS = ['Male', 'Female', 'Non-Binary'] as const;

const NAMES_BY_GENDER: Record<(typeof GENDERS)[number], string[]> = {
  Male: [
    'Arjun',
    'Liam',
    'Mateo',
    'Noah',
    'Aarav',
    'Ethan',
    'Julian',
    'Kai',
    'Leo',
    'Rohan',
    'Lucas',
    'Daniel',
    'Kabir',
    'Sebastian',
    'Vivaan',
    'Owen',
    'Rafael',
    'Zayn',
  ],
  Female: [
    'Maya',
    'Sofia',
    'Ananya',
    'Chloe',
    'Aria',
    'Elena',
    'Diya',
    'Zara',
    'Hannah',
    'Mila',
    'Nora',
    'Priya',
    'Camila',
    'Sienna',
    'Tara',
    'Aisha',
    'Clara',
    'Nadia',
  ],
  'Non-Binary': [
    'Alex',
    'Jordan',
    'River',
    'Sage',
    'Rowan',
    'Avery',
    'Quinn',
    'Taylor',
    'Skyler',
    'Morgan',
    'Charlie',
    'Phoenix',
    'Eden',
    'Riley',
  ],
};

const ALL_NAMES = [
  ...NAMES_BY_GENDER.Male,
  ...NAMES_BY_GENDER.Female,
  ...NAMES_BY_GENDER['Non-Binary'],
];

const AGES = Array.from({ length: 18 }, (_, i) => String(19 + i)); // 19 to 36

const HEIGHTS = Array.from({ length: 39 }, (_, i) => `${155 + i} cm`); // 155 cm to 193 cm

const PERSONALITIES = [
  'Introverted',
  'Extroverted',
  'Ambivert',
  'Hopeless Romantic',
  'Witty & Sarcastic',
  'Golden Retriever Energy',
  'Calm & Mysterious',
  'Creative Dreamer',
  'Adventurous Soul',
  'Old Soul',
  'Warm & Empathetic',
  'Spontaneous',
  'Bookworm',
  'Charming & Loyal',
];

const HOBBIES = [
  'Travelling',
  'Photography',
  'Cooking Pasta',
  'Stargazing',
  'Hiking',
  'Coffee Tasting',
  'Playing Guitar',
  'Painting',
  'Late-Night Drives',
  'Yoga',
  'Film Buff',
  'Baking',
  'Surfing',
  'Reading Sci-Fi',
  'Live Concerts',
  'Pottery',
];

const PROFESSIONS = [
  'Software Engineer',
  'Architect',
  'Graphic Designer',
  'Doctor',
  'Chef',
  'Photographer',
  'Filmmaker',
  'Airline Pilot',
  'Music Producer',
  'Veterinarian',
  'Startup Founder',
  'Astronomer',
  'Fashion Stylist',
  'Data Scientist',
  'Interior Designer',
  'Journalist',
  'Marine Biologist',
];

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateFinalPrediction(): PredictionResult {
  // Weight Male/Female slightly higher while keeping Non-Binary naturally represented
  const genderPool: (typeof GENDERS)[number][] = [
    'Male',
    'Male',
    'Male',
    'Female',
    'Female',
    'Female',
    'Non-Binary',
  ];
  const gender = pickRandom(genderPool);
  const name = pickRandom(NAMES_BY_GENDER[gender]);

  return {
    gender,
    age: pickRandom(AGES),
    height: pickRandom(HEIGHTS),
    name,
    personality: pickRandom(PERSONALITIES),
    hobby: pickRandom(HOBBIES),
    profession: pickRandom(PROFESSIONS),
  };
}

export function getRandomRollingValue(key: AttributeKey): string {
  switch (key) {
    case 'gender':
      return pickRandom(GENDERS);
    case 'age':
      return pickRandom(AGES);
    case 'height':
      return pickRandom(HEIGHTS);
    case 'name':
      return pickRandom(ALL_NAMES);
    case 'personality':
      return pickRandom(PERSONALITIES);
    case 'hobby':
      return pickRandom(HOBBIES);
    case 'profession':
      return pickRandom(PROFESSIONS);
  }
}

export const SAMPLE_PREVIEW_PREDICTION: PredictionResult = {
  gender: 'Male',
  age: '25',
  height: '175 cm',
  name: 'Arjun',
  personality: 'Introverted',
  hobby: 'Travelling',
  profession: 'Software Engineer',
};
