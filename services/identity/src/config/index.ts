import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/hydrobos',
  jwtSecret: process.env.JWT_SECRET || 'hydrobos-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  nodeEnv: process.env.NODE_ENV || 'development',
  bcryptRounds: 12,

  // Entra ID SSO
  entra: {
    enabled: process.env.ENTRA_ENABLED === 'true',
    tenantId: process.env.ENTRA_TENANT_ID || '',
    clientId: process.env.ENTRA_CLIENT_ID || '',
    clientSecret: process.env.ENTRA_CLIENT_SECRET || '',
    redirectUri: process.env.ENTRA_REDIRECT_URI || 'http://localhost:5000/api/auth/callback',
    scopes: (process.env.ENTRA_SCOPES || 'openid,profile,email').split(','),
    authority: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID || 'common'}/v2.0`,
    tokenEndpoint: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID || 'common'}/oauth2/v2.0/token`,
    authorizeEndpoint: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID || 'common'}/oauth2/v2.0/authorize`,
    graphApiBase: 'https://graph.microsoft.com/v1.0',
  },
};
