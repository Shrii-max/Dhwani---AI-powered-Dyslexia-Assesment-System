import { Router, Response } from 'express';
import prisma from '../config/database';
import {
  authenticate,
  optionalAuthenticate,
  AuthRequest,
  requireStudent,
  getOrCreateDefaultStudent
} from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Canonical assessment items definition - the Single Source of Truth
export const canonicalQuestions = [
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_identification',
    slug: 'phoneme-identification',
    title: 'Phoneme Identification',
    category: 'Phonological Awareness',
    difficulty: 'easy',
    prompt: 'Listen carefully. Which sound do you hear at the beginning of "sun"?',
    instruction: 'Listen carefully. Which sound do you hear at the beginning?',
    stimulus: 'sun',
    target_word: 'sun',
    word_audio: 'sun',
    options: ['/s/', '/m/', '/t/'],
    correct_answer: '/s/',
    target_answer: '/s/',
    response_mode: 'click',
    meta: 'Initial sound',
  },
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_matching',
    slug: 'phoneme-matching',
    title: 'Phoneme Matching',
    category: 'Phonological Awareness',
    difficulty: 'easy',
    prompt: 'Listen to the target word "moon", then choose the word that begins with the same sound.',
    instruction: 'Listen to the target word, then choose the word that begins with the same sound.',
    stimulus: 'moon',
    target_word: 'moon',
    word_audio: 'moon',
    options: ['map', 'sun', 'fish'],
    correct_answer: 'map',
    target_answer: 'map',
    response_mode: 'click',
    meta: 'Sound match',
  },
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_blending',
    slug: 'phoneme-blending',
    title: 'Phoneme Blending',
    category: 'Phonological Awareness',
    difficulty: 'medium',
    prompt: 'Listen to each sound: /c/ • /a/ • /t/. Blend them together and choose the word they make.',
    instruction: 'Listen to each sound. Blend them together and choose the word they make.',
    stimulus: '/c/  •  /a/  •  /t/',
    sound_sequence: ['c', 'a', 't'],
    options: ['cat', 'cap', 'tap'],
    correct_answer: 'cat',
    target_answer: 'cat',
    response_mode: 'click',
    meta: '3 sound sequence',
  },
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_segmentation',
    slug: 'phoneme-segmentation',
    title: 'Phoneme Segmentation',
    category: 'Phonological Awareness',
    difficulty: 'medium',
    prompt: 'Listen to the word "SHIP", then say each sound in the word slowly.',
    instruction: 'Listen to the word, then say each sound in the word slowly.',
    stimulus: 'SHIP',
    target_word: 'SHIP',
    word_audio: 'SHIP',
    options: null as any,
    correct_answer: 'ship',
    target_answer: 'ship',
    response_mode: 'mic',
    meta: 'Sound boxes • 3 phonemes',
  },
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_deletion',
    slug: 'phoneme-deletion',
    title: 'Phoneme Deletion',
    category: 'Phonological Awareness',
    difficulty: 'hard',
    prompt: 'Say "smile" without /s/',
    instruction: 'Say the word without the highlighted sound. Record your answer when ready.',
    stimulus: 'Say “smile” without /s/',
    target_word: 'smile',
    word_audio: 'smile',
    options: null as any,
    correct_answer: 'mile',
    target_answer: 'mile',
    response_mode: 'mic',
    meta: 'Remove initial sound',
  },
  {
    section: 'phonological_awareness',
    subskill: 'phoneme_substitution',
    slug: 'phoneme-substitution',
    title: 'Phoneme Substitution',
    category: 'Phonological Awareness',
    difficulty: 'hard',
    prompt: 'Change the beginning sound of "MAT". Replace /m/ with /c/.',
    instruction: 'Change the beginning sound only. Keep the remaining sounds exactly the same.',
    stimulus: 'MAT',
    target_word: 'MAT',
    word_audio: 'MAT',
    swap_sounds: { remove: '/m/', add: '/c/' },
    options: null as any,
    correct_answer: 'cat',
    target_answer: 'cat',
    response_mode: 'mic',
    meta: 'Replace /m/ with /c/',
  },
  {
    section: 'word_reading',
    subskill: 'regular_words',
    slug: 'regular-word-reading',
    title: 'Regular Word Reading',
    category: 'Word Reading',
    difficulty: 'medium',
    prompt: 'Look at the word and read it aloud: JUMP',
    instruction: 'Look at the word and read it aloud.',
    stimulus: 'JUMP',
    target_word: 'JUMP',
    word_audio: 'JUMP',
    options: null as any,
    correct_answer: 'jump',
    target_answer: 'jump',
    response_mode: 'mic',
    meta: 'CVCC pattern • Regular decodable',
  },
  {
    section: 'word_reading',
    subskill: 'irregular_words',
    slug: 'irregular-word-reading',
    title: 'Irregular Word Reading',
    category: 'Word Reading',
    difficulty: 'hard',
    prompt: 'Look carefully at the word and read it aloud: SAID',
    instruction: 'Look carefully at the word and read it aloud.',
    stimulus: 'SAID',
    target_word: 'SAID',
    word_audio: 'SAID',
    options: null as any,
    correct_answer: 'said',
    target_answer: 'said',
    response_mode: 'mic',
    meta: 'Orthographic sight word',
  },
  {
    section: 'word_reading',
    subskill: 'pseudowords',
    slug: 'pseudoword-reading',
    title: 'Pseudoword Reading',
    category: 'Word Reading',
    difficulty: 'hard',
    prompt: 'This is a made-up word. Read it aloud as best you can: MIP',
    instruction: 'This is a made-up word. Read it aloud as best you can.',
    stimulus: 'MIP',
    target_word: 'MIP',
    word_audio: 'MIP',
    options: null as any,
    correct_answer: 'mip',
    target_answer: 'mip',
    response_mode: 'mic',
    meta: 'Novel sequence • CVC',
  },
  {
    section: 'rapid_naming',
    subskill: 'ran_objects',
    slug: 'rapid-naming',
    title: 'Rapid Automatized Naming',
    category: 'Rapid Naming',
    difficulty: 'medium',
    prompt: 'Name each symbol from left to right, starting at the top. Keep going without stopping.',
    instruction: 'Name each symbol from left to right, starting at the top. Keep going without stopping.',
    stimulus: 'RAN grid',
    options: null as any,
    correct_answer: null,
    target_answer: 'ran',
    response_mode: 'mic',
    meta: '5 × 6 stable stimulus array',
  },
];

// Fisher-Yates array shuffle for unbiased randomization
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper to enrich a database item with canonical metadata while preserving unique question data
export function enrichItem(item: any, shuffleOptions: boolean = false) {
  const match = canonicalQuestions.find(
    (q) =>
      (item.subskill && q.subskill === item.subskill) ||
      (item.prompt && q.prompt === item.prompt) ||
      (item.section && q.section === item.section && item.subskill && q.subskill.includes(item.subskill))
  );

  const sec = item.section || match?.section || 'other';
  const sub = item.subskill || match?.subskill || '';
  const title = match?.title || (sub ? sub.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Assessment Item');
  const category = match?.category || (sec ? sec.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Assessment');
  const slug = match?.slug || (sub ? sub.replace(/_/g, '-') : String(item.item_id));

  const prompt = item.prompt || match?.prompt || '';
  const correctAnswer = item.correct_answer || match?.correct_answer;

  // Extract quoted word from prompt (e.g. "sun", "SHIP", "moon", "MAT")
  const quoteMatch = prompt.match(/["“]([^"”]+)["”]/);
  const quotedWord = quoteMatch ? quoteMatch[1] : null;

  // Extract sound sequence if present (e.g. /c/ • /a/ • /t/)
  const soundSeqMatch = prompt.match(/\/([a-zA-Z0-9]+)\//g);
  const soundSequence =
    soundSeqMatch && soundSeqMatch.length >= 2
      ? soundSeqMatch.map((s: string) => s.replace(/\//g, ''))
      : (match?.sound_sequence || null);

  // Extract swap sounds if substitution (e.g. Replace /m/ with /c/)
  let swapSounds = match?.swap_sounds || null;
  const swapMatch = prompt.match(/replace\s+\/([a-zA-Z0-9]+)\/\s+with\s+\/([a-zA-Z0-9]+)\//i);
  if (swapMatch) {
    swapSounds = { remove: `/${swapMatch[1]}/`, add: `/${swapMatch[2]}/` };
  }

  // Derive target word & stimulus dynamically from item data
  const targetWord = item.target_word || quotedWord || correctAnswer || match?.target_word;
  const stimulus = item.stimulus || (sub.includes('segment') && quotedWord ? quotedWord :
    sub.includes('deletion') ? prompt :
    sub.includes('substitut') && quotedWord ? quotedWord :
    quotedWord || correctAnswer || match?.stimulus || prompt);

  let parsedOptions = item.options;
  if (typeof parsedOptions === 'string') {
    try {
      parsedOptions = JSON.parse(parsedOptions);
    } catch {
      parsedOptions = match?.options || null;
    }
  } else if (!parsedOptions && match?.options && item.prompt === match.prompt) {
    parsedOptions = match.options;
  }

  // Randomize answer-option order if applicable and requested without altering correct answer
  let finalOptions = parsedOptions;
  if (Array.isArray(finalOptions) && finalOptions.length > 1 && shuffleOptions) {
    finalOptions = shuffleArray([...finalOptions]);
  }

  return {
    ...item,
    item_id: item.item_id,
    section: sec,
    subskill: sub,
    slug,
    title,
    category,
    instruction: match?.instruction || prompt,
    prompt,
    stimulus,
    target_word: targetWord,
    word_audio: item.word_audio || targetWord || stimulus,
    sound_sequence: soundSequence,
    swap_sounds: swapSounds,
    options: finalOptions,
    correct_answer: correctAnswer,
    target_answer: correctAnswer || match?.target_answer,
    meta: match?.meta || (item.difficulty ? `Difficulty: ${item.difficulty}` : undefined),
    response_mode: item.response_mode || match?.response_mode || 'click'
  };
}

export interface QuizSelectionOptions {
  topic?: string | null;
  limit?: number | null;
  attemptId?: number | null;
  studentId?: number | null;
  refresh?: boolean;
}

// Select a random set of questions belonging ONLY to the requested topic from Neon database
export async function selectRandomQuizQuestions(options: QuizSelectionOptions = {}) {
  const { topic, limit, attemptId, studentId, refresh = false } = options;

  // 1. Topic normalization
  const normalizedTopic =
    topic && topic.trim() && topic.trim().toLowerCase() !== 'all'
      ? topic.trim().toLowerCase().replace(/-/g, '_')
      : null;

  // 2. Configurable question limit (env or param, default 10)
  const envLimit = parseInt(process.env.QUIZ_QUESTION_LIMIT || process.env.QUESTION_LIMIT || '10', 10);
  const quizLimit = limit && !isNaN(limit) && limit > 0 ? limit : (isNaN(envLimit) || envLimit <= 0 ? 10 : envLimit);

  // 3. If an attemptId is provided and NOT a refresh, check if selected_items already exist for this attempt
  if (attemptId && !refresh) {
    try {
      const existing = await prisma.selected_items.findMany({
        where: {
          attempt_id: attemptId,
          ...(normalizedTopic ? { section: { equals: normalizedTopic, mode: 'insensitive' } } : {})
        },
        orderBy: { order_index: 'asc' },
        include: { item_bank: true }
      });

      if (existing.length > 0) {
        // Return existing items for this session in their saved order, without re-shuffling
        return existing.map((e) => enrichItem(e.item_bank, false));
      }
    } catch (err) {
      console.warn('Error querying selected_items for attempt:', err);
    }
  }

  // 4. Query available active items from Neon database
  const whereClause: any = { active: true, is_practice: false };
  if (normalizedTopic) {
    whereClause.section = { equals: normalizedTopic, mode: 'insensitive' };
  }

  let candidates: { item_id: number; section: string }[] = [];
  try {
    candidates = await prisma.item_bank.findMany({
      where: whereClause,
      select: { item_id: true, section: true }
    });
  } catch (dbErr) {
    console.warn('Error querying candidates from item_bank:', dbErr);
  }

  // Fallback to canonical if database is empty or offline
  if (!candidates || candidates.length === 0) {
    let fallback = canonicalQuestions.map((q, idx) => ({
      item_id: idx + 1,
      ...q
    }));
    if (normalizedTopic) {
      fallback = fallback.filter(
        (q) => q.section.toLowerCase() === normalizedTopic || q.section.toLowerCase().includes(normalizedTopic)
      );
    }
    const shuffledFallback = shuffleArray(fallback).slice(0, Math.min(quizLimit, fallback.length));
    return shuffledFallback.map((item) => enrichItem(item, true));
  }

  // 5. Handle small datasets gracefully:
  const effectiveLimit = Math.min(quizLimit, candidates.length);

  // 6. Avoid repeating questions across attempts:
  // Find recent items taken by this student or in recent attempts
  let recentItemIds = new Set<number>();
  try {
    if (studentId || attemptId) {
      const recentSelected = await prisma.selected_items.findMany({
        where: {
          assessment_attempts: studentId
            ? { student_id: studentId }
            : { attempt_id: attemptId! }
        },
        orderBy: { id: 'desc' },
        take: effectiveLimit * 2,
        select: { item_id: true }
      });
      recentItemIds = new Set(recentSelected.map((r) => r.item_id));
    }
  } catch (err) {
    console.warn('Error fetching recent items:', err);
  }

  // Partition into unused vs recently used
  const unused = candidates.filter((c) => !recentItemIds.has(c.item_id));
  const used = candidates.filter((c) => recentItemIds.has(c.item_id));

  // Shuffle both sets
  const shuffledUnused = shuffleArray(unused);
  const shuffledUsed = shuffleArray(used);

  // Prioritize unused items, fill remaining quota with shuffled used items
  const combinedCandidates = [...shuffledUnused, ...shuffledUsed];
  const chosenCandidates = combinedCandidates.slice(0, effectiveLimit);

  // Randomize the presentation order within this attempt
  const finalCandidates = shuffleArray(chosenCandidates);
  const chosenIds = finalCandidates.map((c) => c.item_id);

  // Fetch full records from database for the selected IDs
  const rawItems = await prisma.item_bank.findMany({
    where: { item_id: { in: chosenIds } }
  });

  const rawMap = new Map(rawItems.map((item) => [item.item_id, item]));
  const orderedItems = chosenIds
    .map((id) => rawMap.get(id))
    .filter((item): item is (typeof rawItems)[number] => Boolean(item));

  // 7. If attemptId is present, persist selected_items to Neon database
  if (attemptId) {
    try {
      if (refresh) {
        await prisma.selected_items.deleteMany({
          where: {
            attempt_id: attemptId,
            ...(normalizedTopic ? { section: { equals: normalizedTopic, mode: 'insensitive' } } : {})
          }
        });
      }

      await prisma.selected_items.createMany({
        data: orderedItems.map((item, idx) => ({
          attempt_id: attemptId,
          item_id: item.item_id,
          section: item.section,
          order_index: idx + 1
        }))
      });
    } catch (err) {
      console.warn('Error saving to selected_items:', err);
    }
  }

  // 8. Enrich items and randomize answer-option order
  return orderedItems.map((item) => enrichItem(item, true));
}

// Mapping for frontend slugs to subskills/sections
const slugMap: Record<string, { section?: string; subskill?: string; promptKeyword?: string }> = {
  'phoneme-identification': { section: 'phonological_awareness', subskill: 'phoneme_identification' },
  'phoneme-matching': { section: 'phonological_awareness', subskill: 'phoneme_matching' },
  'phoneme-blending': { section: 'phonological_awareness', subskill: 'phoneme_blending' },
  'phoneme-segmentation': { section: 'phonological_awareness', subskill: 'phoneme_segmentation' },
  'phoneme-deletion': { section: 'phonological_awareness', subskill: 'phoneme_deletion' },
  'phoneme-substitution': { section: 'phonological_awareness', subskill: 'phoneme_substitution' },
  'regular-word-reading': { section: 'word_reading', subskill: 'regular_words' },
  'irregular-word-reading': { section: 'word_reading', subskill: 'irregular_words' },
  'pseudoword-reading': { section: 'word_reading', subskill: 'pseudowords' },
  'rapid-naming': { section: 'rapid_naming', subskill: 'ran_objects' },
};

// Fallback subskill aliases for dataset-imported items
const subskillAliases: Record<string, string[]> = {
  phoneme_identification: ['phoneme_identification_isolation', 'identification'],
  phoneme_matching: ['phoneme_matching', 'matching'],
  phoneme_blending: ['phoneme_blending', 'blending'],
  phoneme_segmentation: ['phoneme_segmentation', 'segmentation'],
  phoneme_deletion: ['phoneme_deletion', 'deletion'],
  phoneme_substitution: ['phoneme_substitution', 'phoneme_substitution_manipulation', 'substitution'],
  regular_words: ['regular_words', 'regular'],
  irregular_words: ['irregular_words', 'irregular'],
  pseudowords: ['pseudowords', 'decoding'],
  ran_objects: ['ran_objects', 'rapid_naming_letters', 'rapid_naming_digits', 'rapid_naming_mixed', 'letters', 'digits', 'mixed'],
};

// Safe audit & sync function for Neon database item_bank (preserves all user data and attempts)
export async function auditAndSyncDatabaseQuestions() {
  const auditReport = {
    checked: canonicalQuestions.length,
    updated: 0,
    inserted: 0,
    alreadyValid: 0,
    details: [] as string[]
  };

  try {
    for (const canonical of canonicalQuestions) {
      let existing = await prisma.item_bank.findFirst({
        where: {
          section: canonical.section,
          subskill: canonical.subskill
        }
      });

      if (!existing) {
        existing = await prisma.item_bank.findFirst({
          where: { prompt: canonical.prompt }
        });
      }

      if (existing) {
        // Check for verifiable mismatches
        const promptMismatch = existing.prompt !== canonical.prompt;
        const answerMismatch = existing.correct_answer !== canonical.correct_answer;
        const modeMismatch = existing.response_mode !== canonical.response_mode;
        const diffMismatch = existing.difficulty !== canonical.difficulty;

        let optionsMismatch = false;
        if (canonical.options) {
          const exOptions = Array.isArray(existing.options)
            ? existing.options
            : typeof existing.options === 'string'
              ? JSON.parse(existing.options)
              : null;
          optionsMismatch = JSON.stringify(exOptions) !== JSON.stringify(canonical.options);
        }

        if (promptMismatch || answerMismatch || modeMismatch || diffMismatch || optionsMismatch) {
          await prisma.item_bank.update({
            where: { item_id: existing.item_id },
            data: {
              prompt: canonical.prompt,
              correct_answer: canonical.correct_answer,
              response_mode: canonical.response_mode,
              difficulty: canonical.difficulty,
              options: canonical.options,
              active: true,
            }
          });
          auditReport.updated++;
          auditReport.details.push(`Updated item_id ${existing.item_id} (${canonical.slug}): synchronized verifiable mismatches`);
        } else {
          auditReport.alreadyValid++;
        }
      } else {
        await prisma.item_bank.create({
          data: {
            section: canonical.section,
            subskill: canonical.subskill,
            difficulty: canonical.difficulty,
            prompt: canonical.prompt,
            options: canonical.options,
            correct_answer: canonical.correct_answer,
            response_mode: canonical.response_mode,
            is_practice: false,
            active: true
          }
        });
        auditReport.inserted++;
        auditReport.details.push(`Inserted missing item (${canonical.slug})`);
      }
    }
  } catch (error) {
    console.error('Audit & sync error:', error);
  }

  return auditReport;
}

// Start new assessment attempt (session)
router.post(
  '/session',
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      let studentId = req.studentId ? parseInt(req.studentId, 10) : null;
      if (!studentId || isNaN(studentId)) {
        try {
          studentId = await getOrCreateDefaultStudent();
        } catch {
          studentId = 1;
        }
      }

      const forceNew = req.body?.forceNew === true || req.query?.forceNew === 'true';

      // Check if there's already an active in-progress session
      let attempt = null;
      if (!forceNew) {
        try {
          attempt = await prisma.assessment_attempts.findFirst({
            where: {
              student_id: studentId,
              status: 'in_progress'
            },
            orderBy: { attempt_id: 'desc' }
          });
        } catch (dbErr) {
          console.warn('Active attempt query fallback:', dbErr);
        }
      }

      if (!attempt) {
        try {
          attempt = await prisma.assessment_attempts.create({
            data: {
              student_id: studentId,
              status: 'in_progress'
            }
          });
        } catch (dbErr) {
          console.warn('Attempt creation fallback:', dbErr);
          attempt = {
            attempt_id: Math.floor(Date.now() / 1000),
            student_id: studentId,
            status: 'in_progress',
            started_at: new Date()
          } as any;
        }
      }

      res.status(201).json({
        success: true,
        message: 'Assessment session started',
        data: {
          attempt,
          session: attempt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get attempt details
router.get(
  '/session/:attemptId',
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const rawAttemptId = req.params.attemptId;
      const attemptId = Array.isArray(rawAttemptId)
        ? rawAttemptId[0]
        : rawAttemptId;

      if (!attemptId || !/^\d+$/.test(attemptId)) {
        throw new AppError('Invalid assessment attempt ID', 400);
      }

      const attempt = await prisma.assessment_attempts.findUnique({
        where: { attempt_id: parseInt(attemptId, 10) },
        include: {
          student_responses: {
            include: {
              item_bank: true,
              audio_recordings: true
            }
          }
        }
      });

      if (!attempt) {
        throw new AppError('Assessment attempt not found', 404);
      }

      // Check authorization
      if (
        req.studentId &&
        attempt.student_id !== parseInt(req.studentId, 10)
      ) {
        throw new AppError('Unauthorized access', 403);
      }

      res.json({
        success: true,
        data: {
          attempt,
          session: attempt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Complete assessment attempt
router.patch(
  '/session/:attemptId/complete',
  authenticate,
  requireStudent,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const rawAttemptId = req.params.attemptId;
      const attemptId = Array.isArray(rawAttemptId)
        ? rawAttemptId[0]
        : rawAttemptId;

      if (!attemptId || !/^\d+$/.test(attemptId)) {
        throw new AppError('Invalid assessment attempt ID', 400);
      }

      const attempt = await prisma.assessment_attempts.findUnique({
        where: { attempt_id: parseInt(attemptId, 10) }
      });

      if (!attempt) {
        throw new AppError('Assessment attempt not found', 404);
      }

      if (attempt.student_id !== parseInt(req.studentId!, 10)) {
        throw new AppError('Unauthorized access', 403);
      }

      const updatedAttempt = await prisma.assessment_attempts.update({
        where: { attempt_id: parseInt(attemptId, 10) },
        data: {
          status: 'completed',
          completed_at: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Assessment completed',
        data: {
          attempt: updatedAttempt,
          session: updatedAttempt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Trigger question audit & sync
router.post('/audit-sync', async (_req: AuthRequest, res: Response, next) => {
  try {
    const report = await auditAndSyncDatabaseQuestions();
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// Get assessment items with optional topic filter, limit, attempt tracking, and randomization
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const topic = (req.query.topic || req.query.section) as string;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const attemptId = req.query.sessionId || req.query.attemptId
      ? parseInt(String(req.query.sessionId || req.query.attemptId), 10)
      : undefined;
    const studentId = req.studentId ? parseInt(req.studentId, 10) : undefined;
    const refresh = req.query.refresh === 'true';

    const items = await selectRandomQuizQuestions({
      topic,
      limit,
      attemptId,
      studentId,
      refresh
    });

    res.json({ success: true, data: { items, tests: items, total: items.length } });
  } catch (error) {
    next(error);
  }
});

// Dedicated questions endpoint
router.get('/questions', optionalAuthenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const topic = (req.query.topic || req.query.section) as string;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const attemptId = req.query.sessionId || req.query.attemptId
      ? parseInt(String(req.query.sessionId || req.query.attemptId), 10)
      : undefined;
    const studentId = req.studentId ? parseInt(req.studentId, 10) : undefined;
    const refresh = req.query.refresh === 'true';

    const items = await selectRandomQuizQuestions({
      topic,
      limit,
      attemptId,
      studentId,
      refresh
    });

    res.json({ success: true, data: { items, tests: items, total: items.length } });
  } catch (error) {
    next(error);
  }
});

// Get items grouped by section/topic (randomized, topic-specific when selected, configurable limit)
router.get('/by-section', optionalAuthenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const topic = (req.query.topic || req.query.section) as string;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const attemptId = req.query.sessionId || req.query.attemptId
      ? parseInt(String(req.query.sessionId || req.query.attemptId), 10)
      : undefined;
    const studentId = req.studentId ? parseInt(req.studentId, 10) : undefined;
    const refresh = req.query.refresh === 'true';

    const sectionNames: Record<string, string> = {
      phonological_awareness: 'Phonological Awareness',
      word_reading: 'Word Reading',
      pseudoword_reading: 'Pseudoword Reading',
      rapid_naming: 'Rapid Naming'
    };

    const items = await selectRandomQuizQuestions({
      topic,
      limit,
      attemptId,
      studentId,
      refresh
    });

    const grouped: Record<string, { section: string; sectionName: string; items: any[] }> = {};
    for (const item of items) {
      const sec = item.section || 'other';
      if (!grouped[sec]) {
        grouped[sec] = {
          section: sec,
          sectionName: sectionNames[sec] || sec.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          items: []
        };
      }
      grouped[sec].items.push({
        ...item,
        subskillName: item.title,
      });
    }

    const sectionOrder = ['phonological_awareness', 'word_reading', 'pseudoword_reading', 'rapid_naming'];
    const sortedSections = Object.values(grouped).sort((a, b) => {
      const ai = sectionOrder.indexOf(a.section);
      const bi = sectionOrder.indexOf(b.section);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    res.json({ success: true, data: { sections: sortedSections, total: items.length } });
  } catch (error) {
    next(error);
  }
});

// Get assessment test by slug or id (public read)
router.get('/:slug', optionalAuthenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const rawSlug = req.params.slug;
    const slug = String(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);
    const sessionId = req.query.sessionId || req.query.attemptId;
    const attemptIdNum = sessionId ? parseInt(String(sessionId), 10) : null;

    // Check if numeric item_id
    if (/^\d+$/.test(slug)) {
      try {
        const item = await prisma.item_bank.findUnique({ where: { item_id: parseInt(slug, 10) } });
        if (item) {
          const enriched = enrichItem(item, true);
          return res.json({ success: true, data: { test: enriched, item: enriched } });
        }
      } catch (err) {
        console.warn('Item query notice:', err);
      }
    }

    // If session ID provided, check selected_items for this attempt first
    if (attemptIdNum) {
      try {
        const selected = await prisma.selected_items.findFirst({
          where: {
            attempt_id: attemptIdNum,
            OR: [
              { item_bank: { subskill: { contains: slug.replace(/-/g, '_'), mode: 'insensitive' } } },
              { item_bank: { section: { contains: slug.replace(/-/g, '_'), mode: 'insensitive' } } }
            ]
          },
          include: { item_bank: true }
        });
        if (selected?.item_bank) {
          const enriched = enrichItem(selected.item_bank, true);
          return res.json({ success: true, data: { test: enriched, item: enriched } });
        }
      } catch (err) {
        console.warn('Selected item check notice:', err);
      }
    }

    const mapping = slugMap[slug];
    const aliases = mapping ? (subskillAliases[mapping.subskill || ''] || [mapping.subskill]) : [];

    let candidateItems: any[] = [];
    try {
      if (mapping) {
        candidateItems = await prisma.item_bank.findMany({
          where: {
            section: mapping.section,
            subskill: { in: aliases.filter(Boolean) as string[] },
            active: true,
            is_practice: false
          }
        });
      }

      if (candidateItems.length === 0) {
        candidateItems = await prisma.item_bank.findMany({
          where: {
            active: true,
            is_practice: false,
            OR: [
              { section: { contains: slug.replace(/-/g, '_'), mode: 'insensitive' } },
              { subskill: { contains: slug.replace(/-/g, '_'), mode: 'insensitive' } }
            ]
          }
        });
      }
    } catch (err) {
      console.warn('Database query for slug notice:', err);
    }

    if (candidateItems.length > 0) {
      // Pick random candidate item instead of always the first one
      const chosenItem = candidateItems[Math.floor(Math.random() * candidateItems.length)];
      const enriched = enrichItem(chosenItem, true);
      return res.json({ success: true, data: { test: enriched, item: enriched } });
    }

    const canonicalMatch = canonicalQuestions.find(
      (q) => q.slug === slug || (mapping && q.subskill === mapping.subskill)
    );
    if (canonicalMatch) {
      const enriched = enrichItem(canonicalMatch, true);
      return res.json({ success: true, data: { test: enriched, item: enriched } });
    }

    throw new AppError(`Assessment test not found for slug: ${slug}`, 404);
  } catch (error) {
    next(error);
  }
});

export default router;
