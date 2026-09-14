import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config/environment';
import { logger } from '../utils/logger';

export class S3Service {
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.bucketName = config.aws.s3Bucket;

    this.client = new S3Client({
      region: config.aws.region,
      endpoint: config.aws.endpoint,
      forcePathStyle: config.aws.forcePathStyle,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
  }

  /**
   * Ensures the configured S3 bucket exists (especially useful for LocalStack on startup).
   */
  async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      logger.info({ bucket: this.bucketName }, 'S3 bucket verified');
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        try {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          logger.info({ bucket: this.bucketName }, 'S3 bucket created successfully in LocalStack');
        } catch (createError: unknown) {
          const createMsg = createError instanceof Error ? createError.message : String(createError);
          logger.error({ error: createMsg, bucket: this.bucketName }, 'Failed to create S3 bucket');
        }
      } else {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          { error: message, bucket: this.bucketName, endpoint: config.aws.endpoint },
          'Could not reach S3/LocalStack on startup (check if LocalStack container is running)'
        );
      }
    }
  }

  /**
   * Uploads a file buffer directly to S3/LocalStack.
   */
  async uploadFile(params: {
    key: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<{ key: string; bucket: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
    });

    await this.client.send(command);
    logger.info({ key: params.key, bucket: this.bucketName }, 'File uploaded to S3 successfully');

    return {
      key: params.key,
      bucket: this.bucketName,
    };
  }

  /**
   * Generates a time-limited cryptographically signed URL for secure client downloads.
   */
  async getPresignedDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });

    return signedUrl;
  }
}

export const s3Service = new S3Service();
