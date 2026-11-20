import { jwtExpirationSeconds, validateEnvironment } from './environment.js';

describe('environment configuration', () => {
  const valid = {
    DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
    JWT_SECRET: 'a-secret-with-at-least-thirty-two-characters',
  };

  it('applies safe defaults', () => {
    expect(validateEnvironment(valid)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      JWT_EXPIRES_IN: '1h',
      CAMPUS_TIMEZONE: 'Asia/Jakarta',
    });
  });

  it('rejects a short JWT secret', () => {
    expect(() =>
      validateEnvironment({ ...valid, JWT_SECRET: 'short' }),
    ).toThrow();
  });

  it.each([
    ['30s', 30],
    ['15m', 900],
    ['2h', 7200],
    ['3d', 259_200],
  ])('converts %s to seconds', (value, seconds) => {
    expect(jwtExpirationSeconds(value)).toBe(seconds);
  });
});
