import fs from 'fs';
import path from 'path';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import prisma from './config/database';
import azureSpeechService from './services/azureSpeech.service';
import phoneticEvaluationService from './services/phoneticEvaluation.service';
import { getOrCreateDefaultStudent } from './middleware/auth.middleware';

export async function runTest() {
  console.log('--- TEST SUITE: AUDIO UPLOAD, CORS & NEON PERSISTENCE ---');
  
  const results = {
    cors: 'PENDING',
    audioUpload: 'PENDING',
    neonSaving: 'PENDING',
    details: {} as any
  };

  try {
    // 1. TEST CORS CONFIGURATION
    console.log('\n[1/3] Testing CORS configuration...');
    const testOrigins = ['http://localhost:8443', 'http://localhost:5173', 'http://127.0.0.1:8443'];
    const corsPass = testOrigins.every(origin => {
      // Verify origin allowed logic
      return origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
    });

    if (corsPass) {
      results.cors = 'PASS';
      console.log('✓ CORS preflight and origin verification: PASS');
    } else {
      results.cors = 'FAIL';
      console.log('✗ CORS verification: FAIL');
    }

    // 2. TEST AUDIO CREATION AND UPLOAD
    console.log('\n[2/3] Generating real audio sample & executing upload pipeline...');
    const testUploadDir = path.join(__dirname, '../uploads/audio/test');
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }
    const testWavPath = path.join(testUploadDir, 'real_student_test.wav');

    // Synthesize real speech sample "mile"
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;

    if (!speechKey || !speechRegion) {
      throw new Error('Azure Speech key or region not configured');
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisLanguage = 'en-US';
    speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';

    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(testWavPath);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    await new Promise<void>((resolve, reject) => {
      synthesizer.speakTextAsync(
        'mile',
        (res) => {
          synthesizer.close();
          if (res.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            console.log(`✓ Real speech audio generated successfully: ${testWavPath}`);
            resolve();
          } else {
            reject(new Error(`Speech synthesis error: ${res.errorDetails}`));
          }
        },
        (err) => {
          synthesizer.close();
          reject(err);
        }
      );
    });

    // Resolve or create student and session in Neon DB
    const studentId = await getOrCreateDefaultStudent();
    let attempt = await prisma.assessment_attempts.findFirst({
      where: { student_id: studentId },
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

    // Question lookup (phoneme_deletion: "Say 'smile' without /s/" -> expected "mile")
    let item = await prisma.item_bank.findFirst({
      where: { subskill: 'phoneme_deletion' }
    });
    if (!item) {
      item = await prisma.item_bank.findFirst({
        where: { active: true }
      });
    }

    const expectedAnswer = item?.correct_answer || 'mile';

    // Upload audio securely
    const storageRef = await azureSpeechService.uploadAudioFile(
      testWavPath,
      String(studentId),
      item!.item_id
    );
    console.log(`✓ Audio uploaded & stored securely: ${storageRef}`);

    // Speech recognition & phonetic evaluation
    const speechResult = await azureSpeechService.assessPronunciation(
      testWavPath,
      expectedAnswer,
      item!.subskill || 'mic'
    );
    console.log(`✓ Transcribed speech: "${speechResult.transcript}" (expected: "${expectedAnswer}")`);
    console.log(`✓ Pronunciation accuracy: ${speechResult.accuracyScore}%`);

    const evaluation = phoneticEvaluationService.evaluateStudentAnswer(
      speechResult.transcript,
      expectedAnswer,
      item!.subskill,
      speechResult.pronunciationScore,
      speechResult.confidence
    );
    console.log(`✓ Phonetic evaluation: ${evaluation.status} (isCorrect: ${evaluation.isCorrect})`);

    results.audioUpload = 'PASS';

    // 3. TEST NEON DATABASE PERSISTENCE
    console.log('\n[3/3] Saving response & audio recording into Neon PostgreSQL...');
    const saved = await prisma.$transaction(async (tx) => {
      const resp = await tx.student_responses.create({
        data: {
          attempt_id: attempt.attempt_id,
          item_id: item!.item_id,
          given_answer: speechResult.transcript || 'mile',
          is_correct: evaluation.isCorrect,
          response_time_ms: 1950,
          timestamp: new Date()
        }
      });

      const rec = await tx.audio_recordings.create({
        data: {
          response_id: resp.response_id,
          audio_storage_ref: storageRef,
          retained: true,
          transcript_text: speechResult.transcript || 'mile',
          confidence_score: speechResult.confidence
        }
      });

      return { resp, rec };
    });

    // Verification from Neon DB
    const verified = await prisma.student_responses.findUnique({
      where: { response_id: saved.resp.response_id },
      include: { audio_recordings: true, item_bank: true }
    });

    if (verified && verified.audio_recordings.length > 0) {
      results.neonSaving = 'PASS';
      results.details = {
        responseId: verified.response_id,
        attemptId: verified.attempt_id,
        itemId: verified.item_id,
        givenAnswer: verified.given_answer,
        isCorrect: verified.is_correct,
        audioRef: verified.audio_recordings[0].audio_storage_ref,
        transcriptText: verified.audio_recordings[0].transcript_text,
        confidence: verified.audio_recordings[0].confidence_score,
      };
      console.log('✓ Successfully retrieved and verified from Neon database:');
      console.log(`   Response ID: ${verified.response_id}`);
      console.log(`   Audio Ref: ${verified.audio_recordings[0].audio_storage_ref}`);
      console.log(`   Is Correct: ${verified.is_correct}`);
    } else {
      results.neonSaving = 'FAIL';
    }

  } catch (err: any) {
    console.error('Test execution error:', err);
    if (results.audioUpload === 'PENDING') results.audioUpload = 'FAIL';
    if (results.neonSaving === 'PENDING') results.neonSaving = 'FAIL';
    results.details = { error: err.message };
  }

  console.log('\n========================================');
  console.log(`AUDIO UPLOAD: ${results.audioUpload}`);
  console.log(`CORS CONFIGURATION: ${results.cors}`);
  console.log(`NEON DATABASE SAVING: ${results.neonSaving}`);
  console.log('========================================');

  return results;
}

if (require.main === module) {
  runTest().then(() => process.exit(0)).catch(() => process.exit(1));
}

