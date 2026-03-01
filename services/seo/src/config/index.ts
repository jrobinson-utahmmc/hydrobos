import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5003', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/hydrobos',
  jwtSecret: process.env.JWT_SECRET || 'hydrobos-dev-secret',
  nodeEnv: process.env.NODE_ENV || 'development',
  identityServiceUrl: process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001',
  packageManagerUrl: process.env.PACKAGE_MANAGER_URL || 'http://localhost:5004',

  // Default external API keys (can be overridden per-request by frontend)
  defaultApiKeys: {
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    googlePageSpeed: process.env.GOOGLE_PAGESPEED_API_KEY || '',
    googleVision: process.env.GOOGLE_VISION_API_KEY || '',
    ahrefs: process.env.AHREFS_API_KEY || '',
  },
};
