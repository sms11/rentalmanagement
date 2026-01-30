import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { NotificationProvider } from '../../context/NotificationContext';

// Custom render function that wraps components with necessary providers
export const renderWithProviders = (ui, options = {}) => {
  const {
    withAuth = true,
    withNotifications = false,
    withRouter = true,
    ...renderOptions
  } = options;

  const Wrapper = ({ children }) => {
    let content = children;

    if (withNotifications && withAuth) {
      content = (
        <AuthProvider>
          <NotificationProvider>{content}</NotificationProvider>
        </AuthProvider>
      );
    } else if (withAuth) {
      content = <AuthProvider>{content}</AuthProvider>;
    }

    if (withRouter) {
      content = <BrowserRouter>{content}</BrowserRouter>;
    }

    return content;
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
};

// Render with just router (no context providers)
export const renderWithRouter = (ui, options = {}) => {
  return renderWithProviders(ui, { withAuth: false, withNotifications: false, withRouter: true, ...options });
};

// Render with auth context
export const renderWithAuth = (ui, options = {}) => {
  return renderWithProviders(ui, { withAuth: true, withNotifications: false, ...options });
};

// Render with all providers
export const renderWithAllProviders = (ui, options = {}) => {
  return renderWithProviders(ui, { withAuth: true, withNotifications: true, ...options });
};

export default renderWithProviders;
