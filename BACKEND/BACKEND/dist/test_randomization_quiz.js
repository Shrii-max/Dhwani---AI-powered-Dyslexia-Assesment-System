"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assessment_routes_1 = require("./routes/assessment.routes");
async function runTests() {
    console.log('====================================================');
    console.log('   RUNNING QUIZ RANDOMIZATION & ATTEMPTS TEST SUITE  ');
    console.log('====================================================\n');
    let passed = 0;
    let failed = 0;
    function assert(condition, testName, detail) {
        if (condition) {
            console.log(`✅ PASS: ${testName}`);
            passed++;
        }
        else {
            console.error(`❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
            failed++;
        }
    }
    // ----------------------------------------------------
    // TEST 1: Topic Filtering & Topic Specificity
    // ----------------------------------------------------
    console.log('--- TEST 1: Topic Specificity ---');
    const paQuestions = await (0, assessment_routes_1.selectRandomQuizQuestions)({ topic: 'phonological_awareness', limit: 10 });
    const allPA = paQuestions.every(q => q.section.toLowerCase() === 'phonological_awareness');
    assert(paQuestions.length > 0 && allPA, 'Fetches questions belonging ONLY to phonological_awareness');
    const readingQuestions = await (0, assessment_routes_1.selectRandomQuizQuestions)({ topic: 'word_reading', limit: 10 });
    const allReading = readingQuestions.every(q => q.section.toLowerCase() === 'word_reading');
    assert(readingQuestions.length > 0 && allReading, 'Fetches questions belonging ONLY to word_reading');
    const ranQuestions = await (0, assessment_routes_1.selectRandomQuizQuestions)({ topic: 'rapid_naming', limit: 10 });
    const allRAN = ranQuestions.every(q => q.section.toLowerCase() === 'rapid_naming');
    assert(ranQuestions.length > 0 && allRAN, 'Fetches questions belonging ONLY to rapid_naming');
    // ----------------------------------------------------
    // TEST 2: No Duplicates Within The Same Quiz Session / Attempt
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Zero Duplicates Within An Attempt ---');
    for (let attempt = 1; attempt <= 5; attempt++) {
        const questions = await (0, assessment_routes_1.selectRandomQuizQuestions)({ topic: 'all', limit: 10 });
        const ids = questions.map(q => q.item_id);
        const uniqueIds = new Set(ids);
        assert(ids.length === uniqueIds.size, `Attempt ${attempt}: ${ids.length} questions, all unique (no duplicates)`);
    }
    // ----------------------------------------------------
    // TEST 3: Configurable Question Limit & Default 10
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Configurable Question Limit ---');
    const limit3 = await (0, assessment_routes_1.selectRandomQuizQuestions)({ topic: 'all', limit: 3 });
    assert(limit3.length === 3, 'Explicit limit=3 returns exactly 3 questions');
    const limit7 = await (0, assessment_routes_1.selectRandomQuizQuestions)({ topic: 'all', limit: 7 });
    assert(limit7.length === 7, 'Explicit limit=7 returns exactly 7 questions');
    const defaultLimitQuestions = await (0, assessment_routes_1.selectRandomQuizQuestions)({ topic: 'all' });
    assert(defaultLimitQuestions.length <= 10, 'Default question limit is capped at 10');
    // ----------------------------------------------------
    // TEST 4: Small Datasets Handled Gracefully
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Small Datasets Handled Gracefully ---');
    // Rapid naming has 1 item in canonical set
    const smallDataset = await (0, assessment_routes_1.selectRandomQuizQuestions)({ topic: 'rapid_naming', limit: 10 });
    const smallIds = smallDataset.map(q => q.item_id);
    const uniqueSmallIds = new Set(smallIds);
    assert(smallDataset.length > 0 && smallDataset.length < 10 && smallIds.length === uniqueSmallIds.size, `Small dataset (requested 10, available ${smallDataset.length}) returned safely without duplicates or errors`);
    // ----------------------------------------------------
    // TEST 5: Randomize Answer-Option Order Without Mismatching Correct Answers
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Option Randomization & Answer Integrity ---');
    const sampleChoiceItem = assessment_routes_1.canonicalQuestions.find(q => q.options && q.options.length > 1);
    if (sampleChoiceItem) {
        const optionPermutations = new Set();
        let answerIntegrityPreserved = true;
        for (let i = 0; i < 20; i++) {
            const enriched = (0, assessment_routes_1.enrichItem)(sampleChoiceItem, true);
            optionPermutations.add(JSON.stringify(enriched.options));
            // Correct answer must remain in options and match
            if (!enriched.options.includes(enriched.correct_answer)) {
                answerIntegrityPreserved = false;
            }
            if (enriched.correct_answer !== sampleChoiceItem.correct_answer) {
                answerIntegrityPreserved = false;
            }
        }
        assert(optionPermutations.size > 1, `Answer options randomize across calls (observed ${optionPermutations.size} distinct permutations)`);
        assert(answerIntegrityPreserved, 'Correct answer is 100% preserved in shuffled options without mismatch');
    }
    // ----------------------------------------------------
    // TEST 6: Multiple Quiz Attempts Generate Different Question Order / Sets
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Variation Across Multiple Attempts ---');
    const attemptsOrder = [];
    for (let i = 0; i < 10; i++) {
        const questions = await (0, assessment_routes_1.selectRandomQuizQuestions)({ topic: 'all', limit: 10, refresh: true });
        attemptsOrder.push(questions.map(q => q.item_id).join(','));
    }
    const uniqueOrders = new Set(attemptsOrder);
    assert(uniqueOrders.size > 1, `Multiple attempts vary across executions (${uniqueOrders.size} unique variations observed across 10 attempts)`);
    // ----------------------------------------------------
    // TEST 7: Dynamic Stimulus & Metadata Enrichment Integrity
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Dynamic Item Enrichment ---');
    // Custom database item with non-canonical prompt and stimulus
    const customDbItem = {
        item_id: 99,
        section: 'phonological_awareness',
        subskill: 'phoneme_identification',
        difficulty: 'medium',
        prompt: 'Listen carefully. Which sound do you hear at the beginning of "boat"?',
        options: ['/b/', '/d/', '/p/'],
        correct_answer: '/b/',
        response_mode: 'click',
        active: true,
        is_practice: false
    };
    const enrichedCustom = (0, assessment_routes_1.enrichItem)(customDbItem, false);
    assert(enrichedCustom.target_word === 'boat', 'Custom item target word dynamically extracted as "boat"');
    assert(enrichedCustom.correct_answer === '/b/', 'Custom item correct answer preserved as "/b/"');
    assert(enrichedCustom.stimulus === 'boat', 'Custom item stimulus preserved as "boat" (not overwritten by canonical "sun")');
    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('====================================================\n');
    if (failed > 0) {
        process.exit(1);
    }
}
runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
