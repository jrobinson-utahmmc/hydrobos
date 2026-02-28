import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5002', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/hydrobos',
  jwtSecret: process.env.JWT_SECRET || 'hydrobos-dev-secret',
  nodeEnv: process.env.NODE_ENV || 'development',
  identityServiceUrl: process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001',
};
