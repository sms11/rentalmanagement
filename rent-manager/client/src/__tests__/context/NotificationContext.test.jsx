import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '../../context/NotificationContext';
import { AuthProvider } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  authAPI: {
    me: vi.fn()
  },
  notificationsAPI: {
    getAll: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    delete: vi.fn(),
    clearAll: vi.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const wrapper = ({ children }) => (
  <AuthProvider>
    <NotificationProvider>{children}</NotificationProvider>
  </AuthProvider>
);

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useNotifications hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useNotifications());
      }).toThrow('useNotifications must be used within a NotificationProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('NotificationProvider', () => {
    it('should initialize with empty notifications', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('fetchNotifications', () => {
    it('should fetch and set notifications', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test', message: 'Test message', isRead: false },
        { id: '2', title: 'Test 2', message: 'Test message 2', isRead: true }
      ];
      notificationsAPI.getAll.mockResolvedValue({ data: mockNotifications });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.notifications).toEqual(mockNotifications);
    });

    it('should handle fetch error gracefully', async () => {
      notificationsAPI.getAll.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.notifications).toEqual([]);
    });
  });

  describe('fetchUnreadCount', () => {
    it('should fetch and set unread count', async () => {
      notificationsAPI.getUnreadCount.mockResolvedValue({ data: { count: 5 } });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.fetchUnreadCount();
      });

      expect(result.current.unreadCount).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and update state', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test', isRead: false },
        { id: '2', title: 'Test 2', isRead: false }
      ];
      notificationsAPI.getAll.mockResolvedValue({ data: mockNotifications });
      notificationsAPI.markAsRead.mockResolvedValue({ data: { id: '1', isRead: true } });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await act(async () => {
        await result.current.markAsRead('1');
      });

      expect(notificationsAPI.markAsRead).toHaveBeenCalledWith('1');
      expect(result.current.notifications[0].isRead).toBe(true);
    });

    it('should decrement unread count when marking as read', async () => {
      notificationsAPI.getUnreadCount.mockResolvedValue({ data: { count: 3 } });
      notificationsAPI.getAll.mockResolvedValue({
        data: [{ id: '1', isRead: false }]
      });
      notificationsAPI.markAsRead.mockResolvedValue({ data: { id: '1', isRead: true } });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.fetchNotifications();
        await result.current.fetchUnreadCount();
      });

      const initialCount = result.current.unreadCount;

      await act(async () => {
        await result.current.markAsRead('1');
      });

      expect(result.current.unreadCount).toBe(initialCount - 1);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test', isRead: false },
        { id: '2', title: 'Test 2', isRead: false }
      ];
      notificationsAPI.getAll.mockResolvedValue({ data: mockNotifications });
      notificationsAPI.markAllAsRead.mockResolvedValue({});

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(notificationsAPI.markAllAsRead).toHaveBeenCalled();
      expect(result.current.notifications.every(n => n.isRead)).toBe(true);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification from list', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test', isRead: false },
        { id: '2', title: 'Test 2', isRead: true }
      ];
      notificationsAPI.getAll.mockResolvedValue({ data: mockNotifications });
      notificationsAPI.delete.mockResolvedValue({});

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.notifications.length).toBe(2);

      await act(async () => {
        await result.current.deleteNotification('1');
      });

      expect(notificationsAPI.delete).toHaveBeenCalledWith('1');
      expect(result.current.notifications.length).toBe(1);
      expect(result.current.notifications[0].id).toBe('2');
    });

    it('should decrement unread count if deleted notification was unread', async () => {
      notificationsAPI.getUnreadCount.mockResolvedValue({ data: { count: 2 } });
      notificationsAPI.getAll.mockResolvedValue({
        data: [
          { id: '1', isRead: false },
          { id: '2', isRead: false }
        ]
      });
      notificationsAPI.delete.mockResolvedValue({});

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.fetchNotifications();
        await result.current.fetchUnreadCount();
      });

      await act(async () => {
        await result.current.deleteNotification('1');
      });

      expect(result.current.unreadCount).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('should clear all notifications', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test' },
        { id: '2', title: 'Test 2' }
      ];
      notificationsAPI.getAll.mockResolvedValue({ data: mockNotifications });
      notificationsAPI.clearAll.mockResolvedValue({});

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await act(async () => {
        await result.current.clearAll();
      });

      expect(notificationsAPI.clearAll).toHaveBeenCalled();
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });
});
