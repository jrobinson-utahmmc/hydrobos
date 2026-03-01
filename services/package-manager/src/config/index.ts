import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5004', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/hydrobos',
  jwtSecret: process.env.JWT_SECRET || 'hydrobos-dev-secret',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CLIENT_URL || 'http://localhost:3000',
  identityServiceUrl: process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001',

  // Internal service discovery — used to health-check installed packages
  serviceUrls: {
    seo: process.env.SEO_SERVICE_URL || 'http://localhost:5003',
  },
};
