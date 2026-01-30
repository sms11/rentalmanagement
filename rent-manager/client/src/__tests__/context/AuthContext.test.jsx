import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn()
  }
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('AuthProvider', () => {
    it('should initialize with null user when no token', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should fetch user when token exists', async () => {
      const mockUser = { id: '1', name: 'Test', email: 'test@test.com', role: 'ADMIN' };
      localStorageMock.getItem.mockReturnValue('valid-token');
      authAPI.me.mockResolvedValue({ data: mockUser });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('should clear token when me() fails', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      authAPI.me.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('login', () => {
    it('should login and save token', async () => {
      const mockUser = { id: '1', name: 'Test', email: 'test@test.com', role: 'ADMIN' };
      localStorageMock.getItem.mockReturnValue(null);
      authAPI.login.mockResolvedValue({
        data: { token: 'new-token', user: mockUser }
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('test@test.com', 'password');
      });

      expect(loginResult).toEqual(mockUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
      expect(result.current.user).toEqual(mockUser);
    });

    it('should throw error on login failure', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      authAPI.login.mockRejectedValue({
        response: { data: { error: 'Invalid credentials' } }
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('test@test.com', 'wrong');
        })
      ).rejects.toEqual({
        response: { data: { error: 'Invalid credentials' } }
      });
    });
  });

  describe('register', () => {
    it('should register and save token', async () => {
      const mockUser = { id: '1', name: 'New User', email: 'new@test.com', role: 'ADMIN' };
      localStorageMock.getItem.mockReturnValue(null);
      authAPI.register.mockResolvedValue({
        data: { token: 'new-token', user: mockUser }
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let registerResult;
      await act(async () => {
        registerResult = await result.current.register('New User', 'new@test.com', 'password');
      });

      expect(registerResult).toEqual(mockUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
    });
  });

  describe('logout', () => {
    it('should clear user and token', async () => {
      const mockUser = { id: '1', name: 'Test', email: 'test@test.com', role: 'ADMIN' };
      localStorageMock.getItem.mockReturnValue('valid-token');
      authAPI.me.mockResolvedValue({ data: mockUser });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('isAdmin', () => {
    it('should return true for ADMIN role', async () => {
      const mockUser = { id: '1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' };
      localStorageMock.getItem.mockReturnValue('valid-token');
      authAPI.me.mockResolvedValue({ data: mockUser });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
    });

    it('should return false for STAFF role', async () => {
      const mockUser = { id: '1', name: 'Staff', email: 'staff@test.com', role: 'STAFF' };
      localStorageMock.getItem.mockReturnValue('valid-token');
      authAPI.me.mockResolvedValue({ data: mockUser });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
    });

    it('should return false when no user', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
    });
  });
});
