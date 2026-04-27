/**
 * Slyceai Response Quality Test Suite
 * Tests 7 gold-standard scenarios against the live chat endpoint.
 *
 * Usage: node scripts/test-ai-quality.mjs
 * Requires: npm run dev must be running on port 3000
 * Auth: Provide a valid session cookie via SESSION_COOKIE env var, OR
 *       set TEST_JWT for a raw Supabase JWT token.
 *
 * The script sends each test message to the /api/chat endpoint and
 * evaluates the response against expected quality signals.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const SESSION_COOKIE = process.env.SESSION_COOKIE || ''
const TEST_JWT = process.env.TEST_JWT || ''
const SESSION_ID = `test-session-${Date.now()}`

const TESTS = [
    {
        id: 'TEST 1 — Symptom mapping (gold standard)',
        message: 'I have neck pain when eating standing up and my hand hurts like it is broken after doing the same work for a long time',
        passCriteria: [
            { label: 'Response > 500 chars (detailed)', check: r => r.length > 500 },
            { label: 'Does NOT just say "consult a doctor"', check: r => !/^(please consult|i recommend consulting|you should see)/i.test(r.trim()) },
            { label: 'Mentions anatomical origin (nerve|muscle|cervical|spine|vertebra)', check: r => /nerve|muscle|cervical|spine|vertebra|spondyl|root/i.test(r) },
            { label: 'Connects multiple symptoms together', check: r => /(connect|both|together|same|unified|underlying|origin|cause)/i.test(r) },
            { label: 'Provides an actionable plan', check: r => /(exercise|physio|stretc|ice|heat|position|posture|recommend|try)/i.test(r) },
        ]
    },
    {
        id: 'TEST 2 — Medicine explanation (specific mechanism)',
        message: 'why is eliwel helping my sleep and digestion',
        passCriteria: [
            { label: 'Response > 200 chars', check: r => r.length > 200 },
            { label: 'Mentions mechanism (serotonin|norepinephrine|muscle|receptor|anticholinergic|tricyclic|amitriptyline)', check: r => /serotonin|norepinephrine|muscle|receptor|anticholinerg|tricyclic|amitriptyline|smooth muscle/i.test(r) },
            { label: 'Does NOT give just generic "treats depression" answer', check: r => !/^eliwel is an antidepressant/i.test(r.trim()) },
        ]
    },
    {
        id: 'TEST 3 — Context usage (profile references)',
        message: 'how am I doing today',
        passCriteria: [
            { label: 'References something from profile (vitals|medicine|condition|symptom|mg|bpm|mmhg)', check: r => /vitals|medicine|tablet|mg|bpm|mmhg|condition|symptom|recorded|history/i.test(r) },
            { label: 'Not a completely generic response', check: r => r.length > 80 },
        ]
    },
    {
        id: 'TEST 4 — Ayurvedic integration',
        message: 'what ayurvedic things can I do for my neck pain',
        passCriteria: [
            { label: 'Mentions specific Ayurvedic remedies (mahanarayan|ashwagandha|turmeric|shallaki|sesame|oil)', check: r => /mahanarayan|ashwagandha|turmeric|shallaki|sesame|brahmi|oil|nasya|panchakarma/i.test(r) },
            { label: 'Mentions checking interaction with current medicines', check: r => /medicine|medication|drug|interact|current|doctor|prescribed/i.test(r) },
            { label: 'Gives actionable specific advice', check: r => r.length > 250 },
        ]
    },
    {
        id: 'TEST 5 — Hindi response',
        message: 'mera sar dard kyun hota hai',
        passCriteria: [
            { label: 'Responds in Hindi/Hinglish (contains Devanagari or Hindi words)', check: r => /[\u0900-\u097F]|sar dard|sir dard|aapka|aapke|pani|gardan|aaiye|karna|hota|kyon|kyun|matlab/i.test(r) },
            { label: 'Response is substantive (>100 chars)', check: r => r.length > 100 },
        ]
    },
    {
        id: 'TEST 6 — Confidence and hope',
        message: 'I have been in pain for 3 years and nothing is working',
        passCriteria: [
            { label: 'Validates the pain is real', check: r => /real|valid|understand|hear|3 year|three year|chronic|long time|frustrat|difficult/i.test(r) },
            { label: 'Ends with hope/forward-looking statement', check: r => /can heal|will improve|path forward|treatable|specific steps|recovery|better|improve|hope|possible/i.test(r) },
            { label: 'Does NOT start with a disclaimer or deflection', check: r => !/^(I cannot|as an AI|please consult|I recommend)/i.test(r.trim()) },
            { label: 'Response > 300 chars', check: r => r.length > 300 },
        ]
    },
    {
        id: 'TEST 7 — Web search trigger',
        message: 'what is the latest research on cervical myofascial pain treatment',
        passCriteria: [
            { label: 'Response > 300 chars (detailed)', check: r => r.length > 300 },
            { label: 'Mentions treatment approaches (physio|trigger|injection|exercise|manual|therapy|research|evidence)', check: r => /physio|trigger point|injection|exercise|manual therapy|research|evidence|study|treatment/i.test(r) },
            { label: 'Does NOT deflect entirely to "consult a doctor" without substance', check: r => !/^please consult/i.test(r.trim()) },
        ]
    },
]

async function callChat(message) {
    const headers = {
        'Content-Type': 'application/json',
    }

    if (SESSION_COOKIE) {
        headers['Cookie'] = SESSION_COOKIE
    } else if (TEST_JWT) {
        headers['Authorization'] = `Bearer ${TEST_JWT}`
    }

    const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, sessionId: SESSION_ID }),
    })

    if (res.status === 401) {
        return { error: 'UNAUTHORIZED — set SESSION_COOKIE or TEST_JWT env var' }
    }

    const data = await res.json()
    return data
}

async function runTests() {
    console.log('\n' + '═'.repeat(70))
    console.log('  SLYCEAI RESPONSE QUALITY TEST SUITE')
    console.log('  Testing against:', BASE_URL)
    console.log('  Session ID:', SESSION_ID)
    console.log('═'.repeat(70) + '\n')

    let passed = 0
    let failed = 0
    const results = []

    for (const test of TESTS) {
        console.log(`\n▶ ${test.id}`)
        console.log(`  Message: "${test.message}"`)

        let response
        try {
            const data = await callChat(test.message)
            if (data.error) {
                console.log(`  ⚠️  Error: ${data.error}`)
                results.push({ id: test.id, result: 'ERROR', error: data.error })
                failed++
                continue
            }
            response = data.content
        } catch (err) {
            console.log(`  ⚠️  Fetch error: ${err.message}`)
            results.push({ id: test.id, result: 'FETCH_ERROR', error: err.message })
            failed++
            continue
        }

        console.log(`  Response (${response.length} chars): "${response.substring(0, 120).replace(/\n/g, ' ')}..."`)

        let testPassed = true
        for (const criterion of test.passCriteria) {
            const ok = criterion.check(response)
            console.log(`  ${ok ? '✅' : '❌'} ${criterion.label}`)
            if (!ok) testPassed = false
        }

        const result = testPassed ? 'PASS' : 'FAIL'
        console.log(`  → ${result}`)

        if (testPassed) passed++
        else failed++

        results.push({ id: test.id, result, responseLength: response.length })

        // Small delay between requests
        await new Promise(r => setTimeout(r, 500))
    }

    console.log('\n' + '═'.repeat(70))
    console.log('  RESULTS SUMMARY')
    console.log('═'.repeat(70))
    for (const r of results) {
        const icon = r.result === 'PASS' ? '✅ PASS' : r.result === 'ERROR' || r.result === 'FETCH_ERROR' ? '⚠️  ERR ' : '❌ FAIL'
        console.log(`  ${icon}  ${r.id}`)
    }
    console.log(`\n  Total: ${TESTS.length} tests | Passed: ${passed} | Failed: ${failed}\n`)

    if (failed > 0) {
        console.log('  ⚠️  Some tests failed. Check the response criteria above.')
        console.log('  Note: AUTH errors mean you need to set SESSION_COOKIE or TEST_JWT.\n')
    } else {
        console.log('  🎉 All tests passed! Slyceai is responding at gold-standard quality.\n')
    }
}

runTests().catch(console.error)
