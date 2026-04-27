/**
 * Quick Bedrock connectivity test
 * Run with: node --env-file=.env.local scripts/test-bedrock.mjs
 */

const apiKey = process.env.BEDROCK_API_KEY
const region = process.env.AWS_BEDROCK_REGION || 'us-east-1'

const modelsToTry = [
    'anthropic.claude-sonnet-4-6',        // in-region (most likely correct for ABSK)
    'us.anthropic.claude-sonnet-4-6',     // cross-region profile
]

async function testModel(model) {
    const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${model}/converse`
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            messages: [{ role: 'user', content: [{ text: 'Say "OK" only' }] }],
            inferenceConfig: { maxTokens: 10 },
        }),
    })

    const text = await res.text()
    return { status: res.status, ok: res.ok, body: text.slice(0, 200) }
}

console.log(`Region: ${region}`)
console.log(`ABSK Key Set: ${!!apiKey}\n`)

for (const model of modelsToTry) {
    process.stdout.write(`Testing: ${model} ... `)
    try {
        const result = await testModel(model)
        if (result.ok) {
            console.log(`✅ SUCCESS (${result.status})`)
            const parsed = JSON.parse(result.body)
            console.log(`   Response: ${parsed?.output?.message?.content?.[0]?.text ?? 'no content'}`)
        } else {
            console.log(`❌ FAILED (${result.status})`)
            console.log(`   Error: ${result.body}`)
        }
    } catch (e) {
        console.log(`❌ EXCEPTION: ${e.message}`)
    }
}
