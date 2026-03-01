import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Microservice endpoints
  services: {
    identity: process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001',
    widget: process.env.WIDGET_SERVICE_URL || 'http://localhost:5002',
    seo: process.env.SEO_SERVICE_URL || 'http://localhost:5003',
    packageManager: process.env.PACKAGE_MANAGER_URL || 'http://localhost:5004',
  },
};
