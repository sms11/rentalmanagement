import { jest } from '@jest/globals';

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Allow time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
