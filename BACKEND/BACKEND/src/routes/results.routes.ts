
import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();


interface CategoryScores {
  phonologicalScore: number;
  wordReadingScore: number;
  rapidNamingScore: number;
}

interface RiskIndicators {
  phonemeDeletionRisk: boolean;
  phonemeSubstRisk: boolean;
  blendingDifficulty: boolean;
  segmentationDifficulty: boolean;
  irregularWordRisk: boolean;
  pseudowordRisk: boolean;
  namingSpeedRisk: boolean;
}

interface AssessmentResponse {
  response_id: number;
  given_answer: string | null;
  is_correct: boolean | null;
  response_time_ms: number | null;
  item_bank: {
    section: string;
    subskill: string | null;
    difficulty: string | null;
    prompt: string;
    correct_answer: string | null;
  };
}

// Normalize section/subskill labels for matching.
function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getResponseScore(response: AssessmentResponse): number {
  if (response.is_correct === true) return 100;
  if (response.is_correct === false) return 0;
  return 0;
}

function calculateCategoryScores(
  responses: AssessmentResponse[]
): CategoryScores {
  const getAverage = (
    predicate: (response: AssessmentResponse) => boolean
  ): number => {
    const matching = responses.filter(predicate);

    if (matching.length === 0) return 0;

    return (
      matching.reduce(
        (sum, response) => sum + getResponseScore(response),
        0
      ) / matching.length
    );
  };

  const phonologicalScore = getAverage((response) => {
    const section = normalize(response.item_bank.section);
    const subskill = normalize(response.item_bank.subskill);

    return (
      section.includes('phonolog') ||
      section.includes('phoneme') ||
      subskill.includes('phonolog') ||
      subskill.includes('phoneme')
    );
  });

  const wordReadingScore = getAverage((response) => {
    const section = normalize(response.item_bank.section);
    const subskill = normalize(response.item_bank.subskill);

    return (
      section.includes('wordreading') ||
      section.includes('reading') ||
      subskill.includes('wordreading') ||
      subskill.includes('irregularword') ||
      subskill.includes('pseudoword')
    );
  });

  const rapidNamingScore = getAverage((response) => {
    const section = normalize(response.item_bank.section);
    const subskill = normalize(response.item_bank.subskill);

    return (
      section.includes('rapidnaming') ||
      section === 'ran' ||
      subskill.includes('rapidnaming') ||
      subskill === 'ran'
    );
  });

  return {
    phonologicalScore,
    wordReadingScore,
    rapidNamingScore,
  };
}

function identifyRiskIndicators(
  responses: AssessmentResponse[],
  categoryScores: CategoryScores
): RiskIndicators {
  const getSubskillScore = (
    keywords: string[],
    threshold: number
  ): boolean => {
    const matching = responses.filter((response) => {
      const subskill = normalize(response.item_bank.subskill);
      const prompt = normalize(response.item_bank.prompt);

      return keywords.some(
        (keyword) =>
          subskill.includes(normalize(keyword)) ||
          prompt.includes(normalize(keyword))
      );
    });

    if (matching.length === 0) return false;

    const average =
      matching.reduce(
        (sum, response) => sum + getResponseScore(response),
        0
      ) / matching.length;

    return average < threshold;
  };

  return {
    phonemeDeletionRisk: getSubskillScore(
      ['phoneme-deletion', 'phoneme deletion'],
      60
    ),
    phonemeSubstRisk: getSubskillScore(
      ['phoneme-substitution', 'phoneme substitution'],
      60
    ),
    blendingDifficulty: getSubskillScore(
      ['phoneme-blending', 'phoneme blending', 'blending'],
      65
    ),
    segmentationDifficulty: getSubskillScore(
      ['phoneme-segmentation', 'phoneme segmentation', 'segmentation'],
      65
    ),
    irregularWordRisk: getSubskillScore(
      ['irregular-word-reading', 'irregular word'],
      50
    ),
    pseudowordRisk: getSubskillScore(
      ['pseudoword-reading', 'pseudoword'],
      55
    ),
    namingSpeedRisk: categoryScores.rapidNamingScore < 60,
  };
}

function calculateOverallScore(scores: CategoryScores): number {
  return (
    scores.phonologicalScore * 0.4 +
    scores.wordReadingScore * 0.35 +
    scores.rapidNamingScore * 0.25
  );
}

function getRiskLevel(
  riskPercent: number
): 'LOW' | 'MODERATE' | 'HIGH' {
  if (riskPercent <= 30) return 'LOW';
  if (riskPercent <= 60) return 'MODERATE';
  return 'HIGH';
}

function generateRecommendations(
  scores: CategoryScores,
  risks: RiskIndicators
) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (scores.phonologicalScore >= 75) {
    strengths.push('Strong phonological awareness performance');
  }

  if (scores.wordReadingScore >= 75) {
    strengths.push('Good word-reading accuracy');
  }

  if (scores.rapidNamingScore >= 75) {
    strengths.push('Good rapid-naming performance');
  }

  if (risks.blendingDifficulty) {
    weaknesses.push('Possible difficulty blending sounds');
    recommendations.push(
      'Practice phoneme-blending activities for 5–10 minutes daily.'
    );
  }

  if (risks.segmentationDifficulty) {
    weaknesses.push('Possible difficulty segmenting sounds');
    recommendations.push(
      'Use sound boxes or counters to practice breaking words into individual sounds.'
    );
  }

  if (risks.phonemeDeletionRisk || risks.phonemeSubstRisk) {
    weaknesses.push('Possible difficulty manipulating sounds within words');
    recommendations.push(
      'Practice structured phoneme deletion and substitution exercises.'
    );
  }

  if (risks.irregularWordRisk) {
    weaknesses.push('Possible difficulty reading irregular words');
    recommendations.push(
      'Practice high-frequency irregular words through repeated, guided reading.'
    );
  }

  if (risks.pseudowordRisk) {
    weaknesses.push('Possible difficulty decoding unfamiliar words');
    recommendations.push(
      'Practice decoding unfamiliar words using structured phonics activities.'
    );
  }

  if (risks.namingSpeedRisk) {
    weaknesses.push('Possible rapid-naming difficulty');
    recommendations.push(
      'Use guided rapid-naming activities and monitor accuracy as well as speed.'
    );
  }

  if (scores.phonologicalScore < 60) {
    recommendations.push(
      'Consider discussing the results with a qualified reading specialist.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Continue regular reading practice and monitor progress over time.'
    );
  }

  return { strengths, weaknesses, recommendations };
}

function parsePositiveId(value: unknown, fieldName: string): number {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }

  return id;
}

// POST /results/calculate
router.post(
  '/calculate',
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.studentId) {
        throw new AppError(
          'Student authentication is required to calculate results',
          403
        );
      }

      const attemptId = parsePositiveId(
        req.body.sessionId,
        'sessionId'
      );

      const studentId = parsePositiveId(
        req.studentId,
        'studentId'
      );

      const attempt = await prisma.assessment_attempts.findUnique({
        where: { attempt_id: attemptId },
        include: {
          student_responses: {
            include: {
              item_bank: true,
            },
          },
        },
      });

      if (!attempt) {
        throw new AppError('Assessment session not found', 404);
      }

      if (attempt.student_id !== studentId) {
        throw new AppError('Unauthorized access', 403);
      }

      if (attempt.status === 'completed') {
        throw new AppError('Assessment is already completed', 400);
      }

      const responses =
        attempt.student_responses as AssessmentResponse[];

      if (responses.length < 10) {
        throw new AppError(
          'Assessment incomplete. At least 10 responses are required.',
          400
        );
      }

      const categoryScores = calculateCategoryScores(responses);
      const riskIndicators = identifyRiskIndicators(
        responses,
        categoryScores
      );

      const overallScore = calculateOverallScore(categoryScores);
      const dyslexiaRiskPercent = 100 - overallScore;
      const dyslexiaRiskLevel = getRiskLevel(dyslexiaRiskPercent);

      const { strengths, weaknesses, recommendations } =
        generateRecommendations(categoryScores, riskIndicators);

      const timedResponses = responses.filter(
        (response) => response.response_time_ms !== null
      );

      const averageResponseTime =
        timedResponses.length > 0
          ? timedResponses.reduce(
              (sum, response) =>
                sum + (response.response_time_ms ?? 0),
              0
            ) / timedResponses.length
          : 0;

      const slowResponseCount = timedResponses.filter(
        (response) => (response.response_time_ms ?? 0) > 10000
      ).length;

      const interpretation =
        `Screening score: ${overallScore.toFixed(1)}%. ` +
        `Calculated screening risk indicator: ${dyslexiaRiskLevel}. ` +
        `This is not a clinical diagnosis.`;

      const result = await prisma.$transaction(async (tx) => {
        const savedResult =
          await tx.overall_screening_result.upsert({
            where: { attempt_id: attemptId },
            create: {
              attempt_id: attemptId,
              composite_score: overallScore,
              profile_indicator: dyslexiaRiskLevel,
              interpretation,
            },
            update: {
              composite_score: overallScore,
              profile_indicator: dyslexiaRiskLevel,
              interpretation,
            },
          });

        const sections = [
          {
            section: 'phonological',
            score: categoryScores.phonologicalScore,
            metric_type: 'percentage'
          },
          {
            section: 'word_reading',
            score: categoryScores.wordReadingScore,
            metric_type: 'percentage'
          },
          {
            section: 'rapid_naming',
            score: categoryScores.rapidNamingScore,
            metric_type: 'percentage'
          },
          {
            section: 'response_timing',
            score: averageResponseTime,
            metric_type: 'milliseconds'
          },
          {
            section: 'slow_response_count',
            score: slowResponseCount,
            metric_type: 'count'
          },
        ];

        // Replace section scores efficiently in a batch
        await tx.section_scores.deleteMany({
          where: { attempt_id: attemptId }
        });

        await tx.section_scores.createMany({
          data: sections.map(s => ({
            attempt_id: attemptId,
            section: s.section,
            score_value: s.score,
            metric_type: s.metric_type
          }))
        });

        await tx.assessment_attempts.update({
          where: { attempt_id: attemptId },
          data: {
            status: 'completed',
            completed_at: new Date(),
          },
        });

        return savedResult;
      }, {
        maxWait: 10000,
        timeout: 30000
      });

      res.status(201).json({
        success: true,
        message: 'Assessment screening results calculated successfully',
        data: {
          result,
          scores: categoryScores,
          dyslexiaRiskPercent,
          dyslexiaRiskLevel,
          riskIndicators,
          strengths,
          weaknesses,
          recommendations,
          timing: {
            averageResponseTimeMs: averageResponseTime,
            slowResponseCount,
          },
          note:
            'This is a screening estimate, not a diagnosis of dyslexia.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /results/:sessionId
router.get(
  '/:sessionId',
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const attemptId = parsePositiveId(
        req.params.sessionId,
        'sessionId'
      );

      const attempt = await prisma.assessment_attempts.findUnique({
        where: { attempt_id: attemptId },
        include: {
          overall_screening_result: true,
          section_scores: true,
        },
      });

      if (!attempt) {
        throw new AppError('Assessment session not found', 404);
      }

      if (req.studentId) {
        if (Number(req.studentId) !== attempt.student_id) {
          throw new AppError('Unauthorized access', 403);
        }
      } else if (req.userId) {
        const parentId = parsePositiveId(req.userId, 'userId');

        const student = await prisma.students.findFirst({
          where: {
            student_id: attempt.student_id,
            parent_id: parentId,
          },
        });

        if (!student) {
          throw new AppError('Unauthorized access', 403);
        }
      } else {
        throw new AppError('Authentication required', 401);
      }

      if (!attempt.overall_screening_result) {
        throw new AppError('Result not found', 404);
      }

      res.json({
        success: true,
        data: {
          result: attempt.overall_screening_result,
          sectionScores: attempt.section_scores,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /results/user/:userId
// Returns results for a parent-owned student.
router.get(
  '/user/:userId',
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.userId || req.userType !== 'parent') {
        throw new AppError('Parent authentication required', 403);
      }

      const parentId = parsePositiveId(req.userId, 'userId');
      const requestedStudentId = parsePositiveId(
        req.params.userId,
        'studentId'
      );

      const student = await prisma.students.findFirst({
        where: {
          student_id: requestedStudentId,
          parent_id: parentId,
        },
      });

      if (!student) {
        throw new AppError('Student not found or unauthorized', 404);
      }

      const attempts = await prisma.assessment_attempts.findMany({
        where: { student_id: requestedStudentId },
        include: {
          overall_screening_result: true,
          section_scores: true,
        },
        orderBy: { attempt_id: 'desc' },
      });

      res.json({
        success: true,
        data: {
          results: attempts
            .filter((attempt) => attempt.overall_screening_result)
            .map((attempt) => ({
              attemptId: attempt.attempt_id,
              completedAt: attempt.completed_at,
              result: attempt.overall_screening_result,
              sectionScores: attempt.section_scores,
            })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;



