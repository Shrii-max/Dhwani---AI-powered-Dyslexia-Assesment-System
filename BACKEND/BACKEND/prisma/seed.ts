import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The 10 core assessment items matching the canonical assessment tasks
// Note: Database check constraint requires response_mode to be 'click' or 'mic'
export const canonicalAssessmentItems = [
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

export async function seedDatabase(prismaClient = prisma) {
  try {
    console.log('🌱 Starting database question audit & seed verification...');

    let inserted = 0;
    let updated = 0;
    let alreadyValid = 0;

    for (const item of canonicalAssessmentItems) {
      // Find matching item by subskill/section or by prompt
      let match = await prismaClient.item_bank.findFirst({
        where: {
          section: item.section,
          subskill: item.subskill
        }
      });

      if (!match) {
        match = await prismaClient.item_bank.findFirst({
          where: { prompt: item.prompt }
        });
      }

      if (!match) {
        await prismaClient.item_bank.create({
          data: item
        });
        inserted++;
      } else {
        // Safe update of verifiable mismatches without touching item_id or relations
        await prismaClient.item_bank.update({
          where: { item_id: match.item_id },
          data: {
            section: item.section,
            subskill: item.subskill,
            difficulty: item.difficulty,
            prompt: item.prompt,
            options: item.options,
            correct_answer: item.correct_answer,
            response_mode: item.response_mode,
            active: true
          }
        });
        updated++;
      }
    }

    const totalCount = await prismaClient.item_bank.count();
    console.log(`✓ Seed verification complete: ${inserted} items inserted, ${updated} items verified/updated. Total item_bank records: ${totalCount}`);
    console.log('✅ Database questions verified successfully without resetting data');
    return { inserted, updated, totalCount };
  } catch (error) {
    console.error('❌ Error seeding/verifying database:', error);
    throw error;
  } finally {
    await prismaClient.$disconnect();
  }
}

if (require.main === module) {
  seedDatabase();
}
