import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().optional().default(''),
  BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
  BETTER_AUTH_URL: z.string().min(1, 'BETTER_AUTH_URL must be a valid URL'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  RESEND_SMTP_FROM: z.string().optional(),

  // Redis configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_URL: z.string().optional(), // Alternative: full connection string

  // Storage configuration (MinIO/S3)
  STORAGE_PROVIDER: z.enum(['local', 'minio', 's3']).default('local'),
  MINIO_ENDPOINT: z.string().default('localhost:9000'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('taskmaster'),
  MINIO_REGION: z.string().default('us-east-1'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),

  // Local storage (development fallback)
  LOCAL_STORAGE_PATH: z.string().default('./uploads'),
  LOCAL_STORAGE_URL: z.string().default('http://localhost:3001/uploads'),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(
        `Invalid environment variables:\n${missingVars}\n\nPlease check your .env file and ensure all required variables are set.`,
      );
    }
    throw error;
  }
}

export const env = validateEnv();
