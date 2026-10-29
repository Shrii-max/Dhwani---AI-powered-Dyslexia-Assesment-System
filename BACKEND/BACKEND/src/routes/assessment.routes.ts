import { Router, Response } from 'express';
import prisma from '../config/database';
import {
  authenticate,
  AuthRequest,
  requireStudent
} from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();

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

// Start new assessment attempt (session)
router.post(
  '/session',
  authenticate,
  requireStudent,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const studentId = parseInt(req.studentId!, 10);

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

// Get all assessment items from item_bank (public read)
router.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const items = await prisma.item_bank.findMany({
      where: { active: true, is_practice: false },
      orderBy: { item_id: 'asc' }
    });
    res.json({ success: true, data: { items, tests: items } });
  } catch (error) {
    next(error);
  }
});

// Get items grouped by section/topic (public read)  ← MUST be before /:slug
router.get('/by-section', async (_req: AuthRequest, res: Response, next) => {
  try {
    const items = await prisma.item_bank.findMany({
      where: { active: true, is_practice: false },
      orderBy: [{ section: 'asc' }, { subskill: 'asc' }, { item_id: 'asc' }]
    });

    const sectionNames: Record<string, string> = {
      phonological_awareness: 'Phonological Awareness',
      word_reading: 'Word Reading',
      pseudoword_reading: 'Pseudoword Reading',
      rapid_naming: 'Rapid Naming'
    };

    const subskillNames: Record<string, string> = {
      phoneme_identification: 'Phoneme Identification',
      phoneme_identification_isolation: 'Phoneme Identification',
      phoneme_matching: 'Phoneme Matching',
      phoneme_blending: 'Phoneme Blending',
      phoneme_segmentation: 'Phoneme Segmentation',
      phoneme_deletion: 'Phoneme Deletion',
      phoneme_substitution: 'Phoneme Substitution',
      phoneme_substitution_manipulation: 'Phoneme Substitution',
      regular_words: 'Regular Word Reading',
      irregular_words: 'Irregular Word Reading',
      pseudowords: 'Pseudoword Reading',
      ran_objects: 'Rapid Automatized Naming',
      rapid_naming_letters: 'Rapid Naming – Letters',
      rapid_naming_digits: 'Rapid Naming – Digits',
      rapid_naming_mixed: 'Rapid Naming – Mixed',
      identification: 'Phoneme Identification',
      matching: 'Phoneme Matching',
      blending: 'Phoneme Blending',
      segmentation: 'Phoneme Segmentation',
      deletion: 'Phoneme Deletion',
      substitution: 'Phoneme Substitution',
      regular: 'Regular Word Reading',
      irregular: 'Irregular Word Reading',
      decoding: 'Pseudoword Decoding',
      digits: 'Rapid Naming – Digits',
      letters: 'Rapid Naming – Letters',
      mixed: 'Rapid Naming – Mixed'
    };

    const subskillToSlug: Record<string, string> = {
      phoneme_identification: 'phoneme-identification',
      phoneme_identification_isolation: 'phoneme-identification',
      phoneme_matching: 'phoneme-matching',
      phoneme_blending: 'phoneme-blending',
      phoneme_segmentation: 'phoneme-segmentation',
      phoneme_deletion: 'phoneme-deletion',
      phoneme_substitution: 'phoneme-substitution',
      phoneme_substitution_manipulation: 'phoneme-substitution',
      regular_words: 'regular-word-reading',
      irregular_words: 'irregular-word-reading',
      pseudowords: 'pseudoword-reading',
      ran_objects: 'rapid-naming',
      rapid_naming_letters: 'rapid-naming',
      rapid_naming_digits: 'rapid-naming',
      rapid_naming_mixed: 'rapid-naming',
      identification: 'phoneme-identification',
      matching: 'phoneme-matching',
      blending: 'phoneme-blending',
      segmentation: 'phoneme-segmentation',
      deletion: 'phoneme-deletion',
      substitution: 'phoneme-substitution',
      regular: 'regular-word-reading',
      irregular: 'irregular-word-reading',
      decoding: 'pseudoword-reading',
      digits: 'rapid-naming',
      letters: 'rapid-naming',
      mixed: 'rapid-naming'
    };

    const grouped: Record<string, { section: string; sectionName: string; items: any[] }> = {};
    for (const item of items) {
      const sec = item.section || 'other';
      if (!grouped[sec]) {
        grouped[sec] = {
          section: sec,
          sectionName: sectionNames[sec] || sec.replace(/_/g, ' '),
          items: []
        };
      }
      const subskill = item.subskill || '';
      grouped[sec].items.push({
        ...item,
        subskillName: subskillNames[subskill] || subskill.replace(/_/g, ' '),
        slug: subskillToSlug[subskill] || subskill.replace(/_/g, '-') || String(item.item_id)
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

// Get assessment test by slug or id (public read)  ← MUST be after named routes
router.get('/:slug', async (req: AuthRequest, res: Response, next) => {
  try {
    const rawSlug = req.params.slug;
    const slug = String(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);

    // Check if numeric item_id
    if (/^\d+$/.test(slug)) {
      const item = await prisma.item_bank.findUnique({ where: { item_id: parseInt(slug, 10) } });
      if (item) return res.json({ success: true, data: { test: item, item } });
    }

    const mapping = slugMap[slug];
    let item = null;

    if (mapping) {
      const aliases = subskillAliases[mapping.subskill || ''] || [mapping.subskill];
      item = await prisma.item_bank.findFirst({
        where: {
          section: mapping.section,
          subskill: { in: aliases.filter(Boolean) as string[] },
          active: true,
          is_practice: false
        },
        orderBy: { item_id: 'asc' }
      });
    }

    if (!item) {
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
    }

    if (!item) throw new AppError(`Assessment test not found for slug: ${slug}`, 404);

    res.json({ success: true, data: { test: item, item } });
  } catch (error) {
    next(error);
  }
});

export default router;
