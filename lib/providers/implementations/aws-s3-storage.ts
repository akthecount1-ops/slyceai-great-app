/**
 * AWS S3 Storage Provider — STUB (Ready to Activate)
 * 
 * TO ACTIVATE:
 * 1. Fill in AWS credentials in .env.local
 * 2. In /lib/providers/registry.ts, replace:
 *    import { SupabaseStorageProvider } from './implementations/supabase-storage'
 *    export const storage: StorageProvider = new SupabaseStorageProvider()
 *    WITH:
 *    import { AWSS3StorageProvider } from './implementations/aws-s3-storage'
 *    export const storage: StorageProvider = new AWSS3StorageProvider()
 * 
 * Nothing else in the application needs to change.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageProvider } from '../interfaces'

export class AWSS3StorageProvider implements StorageProvider {
  private client: S3Client
  private bucket: string

  constructor() {
    const region = process.env.AWS_REGION || 'ap-south-1'
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    this.bucket = process.env.AWS_S3_BUCKET || ''

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured')
    }

    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  async upload(
    _bucket: string, // bucket param ignored — uses env var bucket
    path: string,
    file: Buffer | Blob,
    options?: { contentType?: string }
  ): Promise<{ path: string; url: string }> {
    const body = file instanceof Blob
      ? Buffer.from(await file.arrayBuffer())
      : file

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: body,
        ContentType: options?.contentType,
      })
    )

    const url = `https://${this.bucket}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${path}`
    return { path, url }
  }

  async getSignedUrl(
    _bucket: string,
    path: string,
    expiresIn = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: path })
    return getSignedUrl(this.client, command, { expiresIn })
  }

  async delete(_bucket: string, path: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: path })
    )
  }

  async list(
    _bucket: string,
    prefix?: string
  ): Promise<{ name: string; size: number }[]> {
    const response = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix })
    )
    return (response.Contents ?? []).map((obj) => ({
      name: obj.Key ?? '',
      size: obj.Size ?? 0,
    }))
  }
}
