import * as dotenv from 'dotenv';
import * as Joi from 'joi';

dotenv.config();

interface EnvVars {
  NODE_ENV: string;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_DEFAULT_REGION?: string;
  AWS_BUCKET?: string;
  AWS_USE_PATH_STYLE_ENDPOINT?: boolean;
  AWS_S3_PUBLIC_URL?: string;
  MAIL_HOST?: string;
  MAIL_PORT?: number;
  MAIL_USER?: string;
  MAIL_PASSWORD?: string;
  MAIL_FROM?: string;
}

const envsSchema = Joi.object<EnvVars>({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  // S3 (subida de imágenes de perfil). Opcionales a propósito: sin ellas la
  // app arranca igual, pero el endpoint de subida (cuando exista) va a fallar
  // recién al intentar usarlas.
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  AWS_DEFAULT_REGION: Joi.string().allow('').optional(),
  AWS_BUCKET: Joi.string().allow('').optional(),
  AWS_USE_PATH_STYLE_ENDPOINT: Joi.boolean()
    .truthy('true', '1')
    .falsy('false', '0', '')
    .default(false),
  AWS_S3_PUBLIC_URL: Joi.string().allow('').optional(),
  // Mail (recuperación de contraseña). Opcionales igual que S3: sin ellas la
  // app arranca, pero el envío de correo falla recién al intentar usarlo.
  // Pensado para apuntar a un inbox de Mailtrap en desarrollo.
  MAIL_HOST: Joi.string().allow('').optional(),
  MAIL_PORT: Joi.number().default(2525),
  MAIL_USER: Joi.string().allow('').optional(),
  MAIL_PASSWORD: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string()
    .allow('')
    .default('no-reply@futbol-tracker.local'),
}).unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(
    `Error de configuración de variables de entorno: ${error.message}`,
  );
}

const envVars = value;

const awsRegion = envVars.AWS_DEFAULT_REGION || undefined;
const awsBucket = envVars.AWS_BUCKET || undefined;

export const envs = {
  nodeEnv: envVars.NODE_ENV,
  port: envVars.PORT,
  dbHost: envVars.DB_HOST,
  dbPort: envVars.DB_PORT,
  dbUser: envVars.DB_USER,
  dbPassword: envVars.DB_PASSWORD,
  dbName: envVars.DB_NAME,
  jwtSecret: envVars.JWT_SECRET,
  jwtExpiresIn: envVars.JWT_EXPIRES_IN,
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID || undefined,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY || undefined,
    region: awsRegion,
    bucket: awsBucket,
    // true para S3 compatibles (MinIO, DigitalOcean Spaces, etc.) que
    // necesitan URLs "path-style"; false (default) para AWS S3 real.
    usePathStyleEndpoint: envVars.AWS_USE_PATH_STYLE_ENDPOINT,
    // Si no se define un dominio público propio (ej. CloudFront), se arma la
    // URL directa del bucket — solo tiene sentido una vez que region/bucket
    // estén cargados.
    s3PublicUrl:
      envVars.AWS_S3_PUBLIC_URL ||
      (awsRegion && awsBucket
        ? `https://${awsBucket}.s3.${awsRegion}.amazonaws.com`
        : undefined),
  },
  mail: {
    host: envVars.MAIL_HOST || undefined,
    port: envVars.MAIL_PORT,
    user: envVars.MAIL_USER || undefined,
    pass: envVars.MAIL_PASSWORD || undefined,
    from: envVars.MAIL_FROM,
  },
};
