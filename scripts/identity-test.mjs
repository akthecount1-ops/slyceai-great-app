/**
 * BEDROCK IDENTITY TEST (Bypassing entire app logic)
 * Run with: node --env-file=.env.local scripts/identity-test.mjs
 */

const apiKey = process.env.BEDROCK_API_KEY
const region = process.env.AWS_BEDROCK_REGION || 'us-east-1'
const modelId = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-6'

async function askIdentity() {
    console.log('\n--- 🚀 STARTING FRESH BEDROCK IDENTITY TEST ---')
    console.log(`Using Model ID: ${modelId}`)
    console.log(`Target Region: ${region}\n`)

    const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/converse`

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: [{ text: 'Exactly which version of Claude are you? Please provide your full internal version name.' }]
                    }
                ],
                inferenceConfig: {
                    maxTokens: 500,
                    temperature: 0.1
                },
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('❌ API ERROR:', JSON.stringify(data, null, 2))
            return
        }

        const answer = data.output?.message?.content?.[0]?.text
        console.log('--- 🤖 AI RESPONSE ---')
        console.log(answer)
        console.log('\n-----------------------')
        console.log('✅ TEST COMPLETE')

    } catch (err) {
        console.error('❌ NETWORK ERROR:', err.message)
    }
}

askIdentity()
