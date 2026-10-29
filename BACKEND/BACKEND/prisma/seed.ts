import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The 10 core assessment items matching the frontend assessment tasks
// Note: Database check constraint requires response_mode to be 'click' or 'mic'
const assessmentItems = [
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_identification',
    difficulty: 'easy',
    prompt: 'Listen carefully. Which sound do you hear at the beginning of "sun"?',
    options: ['/s/', '/m/', '/t/'],
    correct_answer: '/s/',
    response_mode: 'click',
    is_practice: false,
    active: true
  },
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_matching',
    difficulty: 'easy',
    prompt: 'Listen to the target word "moon", then choose the word that begins with the same sound.',
    options: ['map', 'sun', 'fish'],
    correct_answer: 'map',
    response_mode: 'click',
    is_practice: false,
    active: true
  },
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_blending',
    difficulty: 'medium',
    prompt: 'Listen to each sound: /c/ • /a/ • /t/. Blend them together and choose the word they make.',
    options: ['cat', 'cap', 'tap'],
    correct_answer: 'cat',
    response_mode: 'click',
    is_practice: false,
    active: true
  },
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_segmentation',
    difficulty: 'medium',
    prompt: 'Listen to the word "SHIP", then say each sound in the word slowly.',
    options: null as any,
    correct_answer: 'ship',
    response_mode: 'mic',
    is_practice: false,
    active: true
  },
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_deletion',
    difficulty: 'hard',
    prompt: 'Say "smile" without /s/',
    options: null as any,
    correct_answer: 'mile',
    response_mode: 'mic',
    is_practice: false,
    active: true
  },
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_substitution',
    difficulty: 'hard',
    prompt: 'Change the beginning sound of "MAT". Replace /m/ with /c/.',
    options: null as any,
    correct_answer: 'cat',
    response_mode: 'mic',
    is_practice: false,
    active: true
  },
  {
    section: 'word_reading',
    subskill: 'regular_words',
    difficulty: 'medium',
    prompt: 'Look at the word and read it aloud: JUMP',
    options: null as any,
    correct_answer: 'jump',
    response_mode: 'mic',
    is_practice: false,
    active: true
  },
  {
    section: 'word_reading',
    subskill: 'irregular_words',
    difficulty: 'hard',
    prompt: 'Look carefully at the word and read it aloud: SAID',
    options: null as any,
    correct_answer: 'said',
    response_mode: 'mic',
    is_practice: false,
    active: true
  },
  {
    section: 'word_reading',
    subskill: 'pseudowords',
    difficulty: 'hard',
    prompt: 'This is a made-up word. Read it aloud as best you can: MIP',
    options: null as any,
    correct_answer: 'mip',
    response_mode: 'mic',
    is_practice: false,
    active: true
  },
  {
    section: 'rapid_naming',
    subskill: 'ran_objects',
    difficulty: 'medium',
    prompt: 'Name each symbol from left to right, starting at the top. Keep going without stopping.',
    options: null as any,
    correct_answer: null,
    response_mode: 'mic',
    is_practice: false,
    active: true
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed check...');

    let inserted = 0;
    let existing = 0;

    for (const item of assessmentItems) {
      const match = await prisma.item_bank.findFirst({
        where: { prompt: item.prompt }
      });

      if (!match) {
        await prisma.item_bank.create({
          data: item
        });
        inserted++;
      } else {
        existing++;
      }
    }

    const totalCount = await prisma.item_bank.count();
    console.log(`✓ Seed check complete: ${inserted} items inserted, ${existing} already existed. Total item_bank records: ${totalCount}`);
    console.log('✅ Database seeding verified successfully');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
