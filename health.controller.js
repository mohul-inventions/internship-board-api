// src/controllers/health.controller.js
// Simple health-check endpoint — confirms the API is running.

export function healthCheck(req, res) {
  res.status(200).json({
    success: true,
    data: {
      status:    'ok',
      timestamp: new Date().toISOString(),
      uptime:    process.uptime(),
    },
    message: 'Service is healthy',
  });
}
