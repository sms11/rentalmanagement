import { describe, it, expect } from 'vitest';

describe('Test Setup Sanity Check', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have localStorage mock', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.setItem).toHaveBeenCalledWith('test', 'value');
  });
});
