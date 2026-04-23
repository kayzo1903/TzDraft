import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly endpoint: string;
  private readonly configured: boolean;
  private readonly missingKeys: string[];

  constructor(private readonly config: ConfigService) {
    const rawAccountId = this.config.get<string>('R2_ACCOUNT_ID', '');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID', '');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY', '');
    this.bucket = this.config.get<string>('R2_BUCKET_NAME', 'tzdraft');
    this.publicUrl = this.normalizeUrl(
      this.config.get<string>('R2_PUBLIC_URL', ''),
    );
    this.endpoint = this.buildEndpoint(rawAccountId);

    this.missingKeys = [
      ['R2_ACCOUNT_ID', rawAccountId],
      ['R2_BUCKET_NAME', this.bucket],
      ['R2_ACCESS_KEY_ID', accessKeyId],
      ['R2_SECRET_ACCESS_KEY', secretAccessKey],
      ['R2_PUBLIC_URL', this.publicUrl],
    ]
      .filter(([, value]) => !this.isConfiguredValue(value))
      .map(([key]) => key);

    this.configured = this.missingKeys.length === 0;

    if (!this.configured) {
      this.client = null;
      this.logger.warn(
        `R2 storage disabled: missing/placeholder env vars: ${this.missingKeys.join(', ')}`,
      );
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private isConfiguredValue(value: string | undefined | null): boolean {
    if (!value) return false;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;

    const placeholders = [
      'your-account-id',
      'your-bucket-name',
      'your-access-key-id',
      'your-secret-access-key',
      'https://your-account-id.r2.cloudflarestorage.com',
      'https://your-public-bucket-url.r2.dev',
    ];

    return !placeholders.includes(normalized);
  }

  private normalizeUrl(value: string): string {
    return value.trim().replace(/\/+$/, '');
  }

  private buildEndpoint(accountId: string): string {
    const normalized = this.normalizeUrl(accountId)
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/\.r2\.cloudflarestorage\.com$/i, '');

    return `https://${normalized}.r2.cloudflarestorage.com`;
  }

  private ensureConfigured(): S3Client {
    if (this.client && this.configured) {
      return this.client;
    }

    throw new ServiceUnavailableException(
      `Avatar storage is not configured. Missing or placeholder env vars: ${this.missingKeys.join(', ')}`,
    );
  }

  async uploadAvatar(
    buffer: Buffer,
    mimeType: string,
    userId: string,
  ): Promise<string> {
    const client = this.ensureConfigured();
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const key = `avatars/${userId}/${randomUUID()}.${ext}`;

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000',
        }),
      );
    } catch (err) {
      this.logger.error(
        `Avatar upload failed for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }

    return `${this.publicUrl}/${key}`;
  }

  async deleteByUrl(url: string): Promise<void> {
    try {
      if (!this.configured || !this.client) return;
      if (!url.startsWith(`${this.publicUrl}/`)) return;

      const key = url.replace(`${this.publicUrl}/`, '');
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(`Failed to delete old avatar: ${err}`);
    }
  }
}
