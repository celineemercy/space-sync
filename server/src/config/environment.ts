import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default('1h'),
  CAMPUS_TIMEZONE: z.string().default('Asia/Jakarta'),
  CORS_ORIGIN: z.string().optional(),
});

export function validateEnvironment(values: Record<string, unknown>) {
  const result = environmentSchema.safeParse(values);
  if (!result.success) {
    throw new Error(`Invalid server configuration: ${result.error.message}`);
  }
  return result.data;
}

export function jwtExpirationSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    throw new Error('JWT_EXPIRES_IN must use s, m, h, or d.');
  }
  const amount = Number(match[1]);
  const factors: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86_400 };
  return amount * factors[match[2]];
}
