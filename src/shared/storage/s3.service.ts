import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { envs } from '../../config/envs';

export interface UploadPublicFileParams {
  buffer: Buffer;
  contentType: string;
  keyPrefix: string;
  extension: string;
}

@Injectable()
export class S3Service {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: envs.aws.region,
      credentials:
        envs.aws.accessKeyId && envs.aws.secretAccessKey
          ? {
              accessKeyId: envs.aws.accessKeyId,
              secretAccessKey: envs.aws.secretAccessKey,
            }
          : undefined,
      forcePathStyle: envs.aws.usePathStyleEndpoint,
    });
  }

  /**
   * Sube un archivo con ACL público (mismo enfoque que `visibility: public`
   * en Laravel) y devuelve la URL final del objeto.
   */
  async uploadPublicFile(params: UploadPublicFileParams): Promise<string> {
    if (!envs.aws.bucket || !envs.aws.region) {
      throw new Error(
        'S3 no está configurado: faltan AWS_BUCKET o AWS_DEFAULT_REGION',
      );
    }

    const key = `${params.keyPrefix}/${randomUUID()}.${params.extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: envs.aws.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType,
        ACL: 'public-read',
      }),
    );

    const base =
      envs.aws.s3PublicUrl ??
      `https://${envs.aws.bucket}.s3.${envs.aws.region}.amazonaws.com`;

    return `${base}/${key}`;
  }
}
