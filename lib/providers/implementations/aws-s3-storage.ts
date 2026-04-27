/**
 * AWS S3 Storage Provider
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
  private _client: S3Client | null = null

  /** Lazy-initialize so the client is built at request time, not module load time */
  private get client(): S3Client {
    if (!this._client) {
      const region = process.env.AWS_S3_REGION || process.env.AWS_REGION || 'ap-south-1'
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

      if (!accessKeyId || !secretAccessKey) {
        throw new Error(
          '[S3] AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in environment variables'
        )
      }

      this._client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      })
    }
    return this._client
  }

  private get bucket(): string {
    const b = process.env.AWS_S3_BUCKET
    if (!b) throw new Error('[S3] AWS_S3_BUCKET is not set in environment variables')
    return b
  }

  async upload(
    _bucket: string, // ignored — uses env var bucket
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

    const region = process.env.AWS_S3_REGION || 'ap-south-1'
    const url = `https://${this.bucket}.s3.${region}.amazonaws.com/${path}`
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

