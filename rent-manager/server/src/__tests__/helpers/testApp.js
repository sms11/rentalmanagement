import express from 'express';
import cors from 'cors';

// Create a fresh Express app for testing
export const createTestApp = (routeSetup) => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Allow custom route setup
  if (routeSetup) {
    routeSetup(app);
  }

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Test app error:', err.message);
    res.status(500).json({
      error: 'Something went wrong!',
      message: err.message
    });
  });

  return app;
};

export default createTestApp;
