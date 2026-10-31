"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk = __importStar(require("microsoft-cognitiveservices-speech-sdk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const azureSpeech_service_1 = __importDefault(require("./services/azureSpeech.service"));
const phoneticEvaluation_service_1 = __importDefault(require("./services/phoneticEvaluation.service"));
dotenv_1.default.config();
async function runEndToEndTest() {
    console.log('🎙️ === DHWANI END-TO-END SPEECH EVALUATION TEST ===');
    const testDir = path_1.default.join(__dirname, '../uploads/audio/test');
    if (!fs_1.default.existsSync(testDir)) {
        fs_1.default.mkdirSync(testDir, { recursive: true });
    }
    const audioFilePath = path_1.default.join(testDir, 'test_student_mile.wav');
    // STEP 1: Generate real speech audio using Azure Speech Synthesizer
    console.log('\n1. Generating real audio sample of student speaking "mile"...');
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;
    if (!speechKey || !speechRegion) {
        throw new Error('Azure Speech credentials missing in .env');
    }
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisLanguage = 'en-US';
    speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFilePath);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
    await new Promise((resolve, reject) => {
        synthesizer.speakTextAsync('mile', (res) => {
            synthesizer.close();
            if (res.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                console.log(`✓ Real speech audio successfully generated: ${audioFilePath} (${res.audioData.byteLength} bytes)`);
                resolve();
            }
            else {
                reject(new Error(`Synthesis failed: ${res.errorDetails}`));
            }
        }, (err) => {
            synthesizer.close();
            reject(err);
        });
    });
    // STEP 2: Fetch question and expected answer from Neon PostgreSQL
    console.log('\n2. Fetching question from Neon database item_bank (phoneme_deletion)...');
    const item = await database_1.default.item_bank.findFirst({
        where: { subskill: 'phoneme_deletion' }
    });
    if (!item) {
        throw new Error('Item for phoneme_deletion not found in database');
    }
    const expectedAnswer = item.correct_answer || 'mile';
    console.log(`✓ Question ID: ${item.item_id}`);
    console.log(`✓ Prompt: "${item.prompt}"`);
    console.log(`✓ Database Expected Answer: "${expectedAnswer}"`);
    // STEP 3: Convert speech into text using Azure Speech AI
    console.log('\n3. Converting speech into text using Azure Speech-to-Text...');
    const speechResult = await azureSpeech_service_1.default.assessPronunciation(audioFilePath, expectedAnswer, item.subskill || 'mic');
    console.log(`✓ Transcribed Speech: "${speechResult.transcript}"`);
    console.log(`✓ Pronunciation Score: ${speechResult.pronunciationScore}%`);
    console.log(`✓ Accuracy Score: ${speechResult.accuracyScore}%`);
    console.log(`✓ Confidence: ${speechResult.confidence}`);
    // STEP 4: Compare student's transcript with expected answer using Phonetic Evaluation
    console.log('\n4. Running phonetic answer evaluation...');
    const evaluation = phoneticEvaluation_service_1.default.evaluateStudentAnswer(speechResult.transcript, expectedAnswer, item.subskill, speechResult.pronunciationScore, speechResult.confidence);
    console.log(`✓ Evaluation Status: ${evaluation.status}`);
    console.log(`✓ Is Correct: ${evaluation.isCorrect}`);
    console.log(`✓ Feedback: "${evaluation.feedback}"`);
    // STEP 5: Preserve audio securely
    console.log('\n5. Preserving audio file in storage...');
    const storageRef = await azureSpeech_service_1.default.uploadAudioFile(audioFilePath, 'test-student-1', item.item_id);
    console.log(`✓ Audio Storage Ref: ${storageRef}`);
    // STEP 6: Save response & audio recording in Neon PostgreSQL via Prisma
    console.log('\n6. Saving response and audio record in Neon PostgreSQL...');
    // Ensure a test attempt exists
    let attempt = await database_1.default.assessment_attempts.findFirst({
        orderBy: { attempt_id: 'desc' }
    });
    if (!attempt) {
        // Find or create test student
        let student = await database_1.default.students.findFirst();
        if (!student) {
            throw new Error('No student found in database for test attempt');
        }
        attempt = await database_1.default.assessment_attempts.create({
            data: {
                student_id: student.student_id,
                status: 'in_progress'
            }
        });
    }
    const savedData = await database_1.default.$transaction(async (tx) => {
        const studentResponse = await tx.student_responses.create({
            data: {
                attempt_id: attempt.attempt_id,
                item_id: item.item_id,
                given_answer: speechResult.transcript,
                is_correct: evaluation.isCorrect,
                response_time_ms: 1850,
                timestamp: new Date()
            }
        });
        const audioRecord = await tx.audio_recordings.create({
            data: {
                response_id: studentResponse.response_id,
                audio_storage_ref: storageRef,
                retained: true,
                transcript_text: speechResult.transcript,
                confidence_score: speechResult.confidence
            }
        });
        return { studentResponse, audioRecord };
    });
    console.log(`✓ Successfully saved to Neon DB student_responses (ID: ${savedData.studentResponse.response_id})`);
    console.log(`✓ Successfully saved to Neon DB audio_recordings (ID: ${savedData.audioRecord.id})`);
    // STEP 7: Verify saved record in Neon DB
    console.log('\n7. Verifying record persistence in Neon PostgreSQL...');
    const verified = await database_1.default.student_responses.findUnique({
        where: { response_id: savedData.studentResponse.response_id },
        include: { audio_recordings: true, item_bank: true }
    });
    if (verified && verified.audio_recordings.length > 0) {
        console.log('✅ PERSISTENCE VERIFIED IN NEON DATABASE:');
        console.log(`   - Response ID: ${verified.response_id}`);
        console.log(`   - Item: ${verified.item_bank.prompt}`);
        console.log(`   - Given Answer: ${verified.given_answer}`);
        console.log(`   - Is Correct: ${verified.is_correct}`);
        console.log(`   - Audio Storage: ${verified.audio_recordings[0].audio_storage_ref}`);
        console.log(`   - Transcript Text: ${verified.audio_recordings[0].transcript_text}`);
    }
    else {
        throw new Error('Verification failed: saved record could not be retrieved');
    }
    // STEP 8: Test negative & unclear cases to ensure low confidence / incorrect answers are properly classified
    console.log('\n8. Testing negative and unclear cases...');
    // Case A: Student did not delete phoneme (said "smile")
    const evalSmile = phoneticEvaluation_service_1.default.evaluateStudentAnswer('smile', 'mile', 'phoneme_deletion', 80);
    console.log(`✓ "smile" against "mile" -> Is Correct: ${evalSmile.isCorrect}, Status: ${evalSmile.status}, ErrorType: ${evalSmile.errorType}`);
    // Case B: Completely silent / unclear audio
    const evalUnclear = phoneticEvaluation_service_1.default.evaluateStudentAnswer('', 'mile', 'phoneme_deletion', 0);
    console.log(`✓ Empty audio -> Is Correct: ${evalUnclear.isCorrect}, Status: ${evalUnclear.status}, ErrorType: ${evalUnclear.errorType}`);
    console.log('\n🎉 ALL END-TO-END FLOW TESTS COMPLETED SUCCESSFULLY!');
}
runEndToEndTest()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});
