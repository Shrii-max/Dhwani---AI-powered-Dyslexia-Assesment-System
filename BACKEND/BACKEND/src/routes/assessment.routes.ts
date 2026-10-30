import { Router, Response } from 'express';
import prisma from '../config/database';
import {
  authenticate,
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

// Helper to enrich a database item with canonical metadata
export function enrichItem(item: any) {
  const match = canonicalQuestions.find(
    (q) =>
      (item.subskill && q.subskill === item.subskill) ||
      (item.prompt && q.prompt === item.prompt) ||
      (item.section && q.section === item.section && item.subskill && q.subskill.includes(item.subskill))
  );

  if (!match) {
    const sec = item.section || 'other';
    const sub = item.subskill || '';
    return {
      ...item,
      slug: sub ? sub.replace(/_/g, '-') : String(item.item_id),
      title: sub ? sub.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Assessment Item',
      category: sec ? sec.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Assessment',
      instruction: item.prompt,
      stimulus: item.correct_answer || item.prompt,
      target_answer: item.correct_answer,
    };
  }

  let parsedOptions = item.options;
  if (typeof parsedOptions === 'string') {
    try {
      parsedOptions = JSON.parse(parsedOptions);
    } catch {
      parsedOptions = match.options;
    }
  }

  return {
    ...item,
    slug: match.slug,
    title: match.title,
    category: match.category,
    instruction: match.instruction,
    stimulus: match.stimulus,
    target_word: match.target_word,
    word_audio: match.word_audio,
    sound_sequence: match.sound_sequence,
    swap_sounds: match.swap_sounds,
    options: parsedOptions || match.options,
    correct_answer: item.correct_answer || match.correct_answer,
    target_answer: match.target_answer || item.correct_answer,
    meta: match.meta || (item.difficulty ? `Difficulty: ${item.difficulty}` : undefined),
  };
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
        studentId = await getOrCreateDefaultStudent();
      }

      // Check if there's already an active in-progress session
      let attempt = await prisma.assessment_attempts.findFirst({
        where: {
          student_id: studentId,
          status: 'in_progress'
        },
        orderBy: { attempt_id: 'desc' }
      });

      if (!attempt) {
        attempt = await prisma.assessment_attempts.create({
          data: {
            student_id: studentId,
            status: 'in_progress'
          }
        });
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

// Get all assessment items from item_bank (public read)
router.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const rawItems = await prisma.item_bank.findMany({
      where: { active: true, is_practice: false },
      orderBy: { item_id: 'asc' }
    });

    const items = rawItems.map(enrichItem);
    res.json({ success: true, data: { items, tests: items } });
  } catch (error) {
    next(error);
  }
});

// Get items grouped by section/topic (public read)
router.get('/by-section', async (_req: AuthRequest, res: Response, next) => {
  try {
    let rawItems: any[] = [];
    try {
      rawItems = await prisma.item_bank.findMany({
        where: { active: true, is_practice: false },
        orderBy: [{ section: 'asc' }, { subskill: 'asc' }, { item_id: 'asc' }]
      });
    } catch (dbErr) {
      console.warn('item_bank query notice, serving canonical questions:', dbErr);
    }

    if (!rawItems || rawItems.length === 0) {
      rawItems = canonicalQuestions.map((q, idx) => ({
        item_id: idx + 1,
        ...q
      }));
    }

    const sectionNames: Record<string, string> = {
      phonological_awareness: 'Phonological Awareness',
      word_reading: 'Word Reading',
      pseudoword_reading: 'Pseudoword Reading',
      rapid_naming: 'Rapid Naming'
    };

    const grouped: Record<string, { section: string; sectionName: string; items: any[] }> = {};
    for (const rawItem of rawItems) {
      const item = enrichItem(rawItem);
      const sec = item.section || 'other';
      if (!grouped[sec]) {
        grouped[sec] = {
          section: sec,
          sectionName: sectionNames[sec] || sec.replace(/_/g, ' '),
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

    res.json({ success: true, data: { sections: sortedSections, total: rawItems.length } });
  } catch (error) {
    next(error);
  }
});

// Get assessment test by slug or id (public read)
router.get('/:slug', async (req: AuthRequest, res: Response, next) => {
  try {
    const rawSlug = req.params.slug;
    const slug = String(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);

    const mapping = slugMap[slug];
    const canonicalMatch = canonicalQuestions.find(
      (q) => q.slug === slug || (mapping && q.subskill === mapping.subskill)
    );

    // Check if numeric item_id
    if (/^\d+$/.test(slug)) {
      try {
        const item = await prisma.item_bank.findUnique({ where: { item_id: parseInt(slug, 10) } });
        if (item) {
          const enriched = enrichItem(item);
          return res.json({ success: true, data: { test: enriched, item: enriched } });
        }
      } catch (err) {
        console.warn('Item query notice:', err);
      }
      if (canonicalMatch) {
        return res.json({ success: true, data: { test: canonicalMatch, item: canonicalMatch } });
      }
    }

    let item = null;

    if (mapping) {
      const aliases = subskillAliases[mapping.subskill || ''] || [mapping.subskill];
      try {
        item = await prisma.item_bank.findFirst({
          where: {
            section: mapping.section,
            subskill: { in: aliases.filter(Boolean) as string[] },
            active: true,
            is_practice: false
          },
          orderBy: { item_id: 'asc' }
        });
      } catch (err) {
        console.warn('Item by subskill query notice:', err);
      }
    }

    if (!item) {
      try {
        item = await prisma.item_bank.findFirst({
          where: {
            active: true,
            is_practice: false,
            OR: [
              { section: { contains: slug.replace(/-/g, '_'), mode: 'insensitive' } },
              { subskill: { contains: slug.replace(/-/g, '_'), mode: 'insensitive' } }
            ]
          },
          orderBy: { item_id: 'asc' }
        });
      } catch (err) {
        console.warn('Item fuzzy query notice:', err);
      }
    }

    if (!item && canonicalMatch) {
      return res.json({ success: true, data: { test: canonicalMatch, item: canonicalMatch } });
    }

    if (!item) {
      throw new AppError(`Assessment test not found for slug: ${slug}`, 404);
    }

    const enriched = enrichItem(item);
    res.json({ success: true, data: { test: enriched, item: enriched } });
  } catch (error) {
    next(error);
  }
});

export default router;
