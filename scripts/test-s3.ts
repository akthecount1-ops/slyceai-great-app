import { AWSS3StorageProvider } from '../lib/providers/implementations/aws-s3-storage'
import path from 'path'

async function test() {

    console.log('--- AWS S3 CONNECTION TEST ---')
    console.log('Bucket:', process.env.AWS_S3_BUCKET)
    console.log('Region:', process.env.AWS_REGION)
    console.log('Access Key ID Set:', !!process.env.AWS_ACCESS_KEY_ID)

    try {
        const provider = new AWSS3StorageProvider()
        const testContent = Buffer.from('Health AI S3 Connectivity Test')
        const testPath = `test/connectivity-test-${Date.now()}.txt`

        console.log('\n1. Attempting Upload...')
        const result = await provider.upload('documents', testPath, testContent, { contentType: 'text/plain' })
        console.log('✅ Upload Success!')
        console.log('Path:', result.path)
        console.log('URL:', result.url)

        console.log('\n2. Attempting Signed URL Generation...')
        const signedUrl = await provider.getSignedUrl('documents', testPath, 60)
        console.log('✅ Signed URL generated successfully!')

        console.log('\n3. Attempting Deletion...')
        await provider.delete('documents', testPath)
        console.log('✅ Deletion Success!')

        console.log('\n🎉 ALL TESTS PASSED! Your AWS S3 integration is 100% operational.')
    } catch (err) {
        console.error('\n❌ TEST FAILED!')
        if (err instanceof Error) {
            console.error('Error:', err.message)
            if (err.message.includes('credentials')) {
                console.error('Tip: Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set in .env.local')
            }
        } else {
            console.error('Error:', err)
        }
        process.exit(1)
    }
}

test()
