/**
 * Storage Service - MinIO/S3 Compatible Object Storage
 *
 * Abstraction layer for file storage operations.
 * Supports MinIO, S3, and local filesystem (development).
 */

import { env } from '@/config/env';
import { createAppError } from '@/lib/errors';

// =============================================================================
// TYPES
// =============================================================================

export type StorageProviderType = 'minio' | 's3' | 'local';

export interface UploadOptions {
  bucket?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageFile {
  key: string;
  bucket: string;
  size: number;
  contentType: string;
  etag?: string;
  lastModified?: Date;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds, default 3600
  contentType?: string; // for upload URLs
}

export interface StorageProvider {
  upload(
    key: string,
    data: Buffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<StorageFile>;
  delete(key: string, bucket?: string): Promise<void>;
  deleteMany(keys: string[], bucket?: string): Promise<void>;
  getSignedDownloadUrl(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<string>;
  getSignedUploadUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  exists(key: string, bucket?: string): Promise<boolean>;
  getMetadata(key: string, bucket?: string): Promise<StorageFile | null>;
}

// =============================================================================
// MINIO PROVIDER
// =============================================================================

/**
 * MinIO Storage Provider
 * Uses S3-compatible API via native fetch (no aws-sdk needed)
 */
export class MinioStorageProvider implements StorageProvider {
  private endpoint: string;
  private accessKey: string;
  private secretKey: string;
  private defaultBucket: string;
  private region: string;
  private useSSL: boolean;

  constructor() {
    this.endpoint = env.MINIO_ENDPOINT;
    this.accessKey = env.MINIO_ACCESS_KEY;
    this.secretKey = env.MINIO_SECRET_KEY;
    this.defaultBucket = env.MINIO_BUCKET;
    this.region = env.MINIO_REGION || 'us-east-1';
    this.useSSL = env.MINIO_USE_SSL ?? false;
  }

  private getBaseUrl(): string {
    const protocol = this.useSSL ? 'https' : 'http';
    return `${protocol}://${this.endpoint}`;
  }

  /**
   * Generate AWS Signature Version 4
   * Simplified implementation for basic S3 operations
   */
  private async sign(
    method: string,
    path: string,
    headers: Record<string, string>,
    payload: Buffer | Uint8Array | string = '',
  ): Promise<Record<string, string>> {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

    // Hash payload
    const payloadHash = await this.sha256(payload);

    // Canonical headers
    const signedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort()
      .join(';');

    const canonicalHeaders =
      Object.entries(headers)
        .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
        .sort()
        .join('\n') + '\n';

    // Canonical request
    const canonicalRequest = [
      method,
      path,
      '', // query string
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to sign
    const scope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      await this.sha256(canonicalRequest),
    ].join('\n');

    // Signing key
    const kDate = await this.hmacSha256(`AWS4${this.secretKey}`, dateStamp);
    const kRegion = await this.hmacSha256(kDate, this.region);
    const kService = await this.hmacSha256(kRegion, 's3');
    const kSigning = await this.hmacSha256(kService, 'aws4_request');

    // Signature
    const signature = await this.hmacSha256Hex(kSigning, stringToSign);

    return {
      ...headers,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
  }

  private async sha256(data: string | Buffer | Uint8Array): Promise<string> {
    let bytes: Uint8Array;
    if (typeof data === 'string') {
      bytes = new TextEncoder().encode(data);
    } else {
      bytes = new Uint8Array(data);
    }
    // Type assertion needed due to Bun's TypeScript definitions
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      bytes as unknown as BufferSource,
    );
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hmacSha256(
    key: string | ArrayBuffer,
    data: string,
  ): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const keyBuffer = typeof key === 'string' ? encoder.encode(key) : key;
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  }

  private async hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
    const result = await this.hmacSha256(key, data);
    return Array.from(new Uint8Array(result))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<StorageFile> {
    const bucket = options?.bucket || this.defaultBucket;
    const path = `/${bucket}/${key}`;
    const url = `${this.getBaseUrl()}${path}`;

    const headers: Record<string, string> = {
      Host: this.endpoint,
      'Content-Type': options?.contentType || 'application/octet-stream',
      'Content-Length': data.length.toString(),
    };

    // Add custom metadata
    if (options?.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k}`] = v;
      }
    }

    const signedHeaders = await this.sign('PUT', path, headers, data);

    // Convert to ArrayBuffer for fetch body
    const bodyBuffer = new Uint8Array(data).buffer;

    const response = await fetch(url, {
      method: 'PUT',
      headers: signedHeaders,
      body: bodyBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw createAppError(`Storage upload failed: ${errorText}`, {
        statusCode: 500,
        code: 'STORAGE_ERROR',
      });
    }

    return {
      key,
      bucket,
      size: data.length,
      contentType: options?.contentType || 'application/octet-stream',
      etag: response.headers.get('etag') || undefined,
    };
  }

  async delete(key: string, bucket?: string): Promise<void> {
    const targetBucket = bucket || this.defaultBucket;
    const path = `/${targetBucket}/${key}`;
    const url = `${this.getBaseUrl()}${path}`;

    const headers: Record<string, string> = {
      Host: this.endpoint,
    };

    const signedHeaders = await this.sign('DELETE', path, headers);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: signedHeaders,
    });

    // 204 No Content is success, 404 is also acceptable (already deleted)
    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw createAppError(`Storage delete failed: ${errorText}`, {
        statusCode: 500,
        code: 'STORAGE_ERROR',
      });
    }
  }

  async deleteMany(keys: string[], bucket?: string): Promise<void> {
    // MinIO supports multi-object delete, but for simplicity we'll do sequential
    // TODO: Implement proper multi-object delete XML request
    await Promise.all(keys.map((key) => this.delete(key, bucket)));
  }

  async getSignedDownloadUrl(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    const bucket = this.defaultBucket;
    const expiresIn = options?.expiresIn || 3600;
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const scope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKey}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host',
    });

    const path = `/${bucket}/${key}`;
    const canonicalRequest = [
      'GET',
      path,
      queryParams.toString(),
      `host:${this.endpoint}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      await this.sha256(canonicalRequest),
    ].join('\n');

    const kDate = await this.hmacSha256(`AWS4${this.secretKey}`, dateStamp);
    const kRegion = await this.hmacSha256(kDate, this.region);
    const kService = await this.hmacSha256(kRegion, 's3');
    const kSigning = await this.hmacSha256(kService, 'aws4_request');
    const signature = await this.hmacSha256Hex(kSigning, stringToSign);

    queryParams.append('X-Amz-Signature', signature);

    return `${this.getBaseUrl()}${path}?${queryParams.toString()}`;
  }

  async getSignedUploadUrl(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    // Similar to download but for PUT
    const bucket = this.defaultBucket;
    const expiresIn = options?.expiresIn || 3600;
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const scope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKey}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host',
    });

    const path = `/${bucket}/${key}`;
    const canonicalRequest = [
      'PUT',
      path,
      queryParams.toString(),
      `host:${this.endpoint}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      await this.sha256(canonicalRequest),
    ].join('\n');

    const kDate = await this.hmacSha256(`AWS4${this.secretKey}`, dateStamp);
    const kRegion = await this.hmacSha256(kDate, this.region);
    const kService = await this.hmacSha256(kRegion, 's3');
    const kSigning = await this.hmacSha256(kService, 'aws4_request');
    const signature = await this.hmacSha256Hex(kSigning, stringToSign);

    queryParams.append('X-Amz-Signature', signature);

    return `${this.getBaseUrl()}${path}?${queryParams.toString()}`;
  }

  async exists(key: string, bucket?: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(key, bucket);
      return metadata !== null;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string, bucket?: string): Promise<StorageFile | null> {
    const targetBucket = bucket || this.defaultBucket;
    const path = `/${targetBucket}/${key}`;
    const url = `${this.getBaseUrl()}${path}`;

    const headers: Record<string, string> = {
      Host: this.endpoint,
    };

    const signedHeaders = await this.sign('HEAD', path, headers);

    const response = await fetch(url, {
      method: 'HEAD',
      headers: signedHeaders,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw createAppError('Failed to get file metadata', {
        statusCode: 500,
        code: 'STORAGE_ERROR',
      });
    }

    return {
      key,
      bucket: targetBucket,
      size: parseInt(response.headers.get('content-length') || '0', 10),
      contentType:
        response.headers.get('content-type') || 'application/octet-stream',
      etag: response.headers.get('etag') || undefined,
      lastModified: response.headers.get('last-modified')
        ? new Date(response.headers.get('last-modified')!)
        : undefined,
    };
  }
}

// =============================================================================
// LOCAL FILESYSTEM PROVIDER (Development)
// =============================================================================

import { mkdir, writeFile, unlink, stat, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = env.LOCAL_STORAGE_PATH || './uploads';
    this.baseUrl = env.LOCAL_STORAGE_URL || 'http://localhost:3001/uploads';
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<StorageFile> {
    const filePath = join(this.basePath, key);

    // Ensure directory exists
    await mkdir(dirname(filePath), { recursive: true });

    // Write file
    await writeFile(filePath, data);

    return {
      key,
      bucket: 'local',
      size: data.length,
      contentType: options?.contentType || 'application/octet-stream',
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.basePath, key);
    try {
      await unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw createAppError(`Failed to delete file: ${error.message}`, {
          statusCode: 500,
          code: 'STORAGE_ERROR',
        });
      }
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.delete(key)));
  }

  async getSignedDownloadUrl(key: string): Promise<string> {
    // For local storage, just return the direct URL
    // In production, you might want to add a signed token
    return `${this.baseUrl}/${key}`;
  }

  async getSignedUploadUrl(key: string): Promise<string> {
    // Local storage doesn't support presigned uploads
    // Return a placeholder - actual upload should go through the API
    return `${this.baseUrl}/upload/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    const filePath = join(this.basePath, key);
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<StorageFile | null> {
    const filePath = join(this.basePath, key);
    try {
      const stats = await stat(filePath);
      return {
        key,
        bucket: 'local',
        size: stats.size,
        contentType: 'application/octet-stream',
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }
}

// =============================================================================
// STORAGE SERVICE FACTORY
// =============================================================================

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (storageInstance) {
    return storageInstance;
  }

  const provider = env.STORAGE_PROVIDER || 'local';

  switch (provider) {
    case 'minio':
    case 's3':
      storageInstance = new MinioStorageProvider();
      break;
    case 'local':
    default:
      storageInstance = new LocalStorageProvider();
      break;
  }

  return storageInstance;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique storage key for an attachment
 */
export function generateStorageKey(
  issueId: string,
  filename: string,
  prefix = 'attachments',
): string {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${prefix}/${issueId}/${timestamp}-${randomSuffix}-${safeFilename}`;
}

/**
 * Generate a thumbnail storage key
 */
export function generateThumbnailKey(storageKey: string): string {
  const parts = storageKey.split('/');
  const filename = parts.pop()!;
  return [...parts, 'thumbnails', filename].join('/');
}
