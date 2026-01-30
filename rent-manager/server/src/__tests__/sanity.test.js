import { describe, it, expect } from '@jest/globals';

describe('Test Setup Sanity Check', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have environment variables set', () => {
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret');
    expect(process.env.NODE_ENV).toBe('test');
  });
});
