import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { generateToken, verifyToken } from '../utils/jwt';
import {
  getSsoConfig,
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  decodeIdToken,
  fetchGraphProfile,
  upsertSsoUser,
} from '../services/entra';

const router = Router();

// ──────────────────────────────────────
// Local Auth Endpoints
// ──────────────────────────────────────

/**
 * POST /setup — First-run admin bootstrap
 */
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      res.status(400).json({ error: 'System is already initialized' });
      return;
    }

    const { email, password, displayName, organizationName } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Email, password, and display name are required' });
      return;
    }

    if (password.length < 12) {
      res.status(400).json({ error: 'Password must be at least 12 characters' });
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      res.status(400).json({
        error: 'Password must contain uppercase, lowercase, and a number',
      });
      return;
    }

    const admin = new User({
      email,
      password,
      displayName,
      role: 'platform_admin',
      authProvider: 'local',
    });

    await admin.save();

    const token = generateToken({
      userId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      authProvider: 'local',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ message: 'Admin account created', user: admin.toJSON() });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
});

/**
 * POST /login — Local email + password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      authProvider: 'local',
    });

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'This account has been disabled' });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      authProvider: 'local',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /logout — Clear auth cookie
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /me — Get current user from JWT
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: user.toJSON() });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * GET /verify — Verify a JWT token (used by gateway/other services)
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ valid: false });
      return;
    }
    const decoded = verifyToken(token);
    res.json({ valid: true, payload: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// ──────────────────────────────────────
// SSO / Entra ID Endpoints
// ──────────────────────────────────────

/**
 * GET /sso/status — Check if SSO is enabled
 */
router.get('/sso/status', async (_req: Request, res: Response) => {
  try {
    const ssoConfig = await getSsoConfig();
    res.json({
      enabled: ssoConfig?.enabled ?? false,
      provider: ssoConfig ? 'Microsoft Entra ID' : null,
    });
  } catch {
    res.json({ enabled: false, provider: null });
  }
});

/**
 * GET /sso/authorize — Start OIDC flow (redirect to Entra ID)
 */
router.get('/sso/authorize', async (_req: Request, res: Response) => {
  try {
    const ssoConfig = await getSsoConfig();
    if (!ssoConfig?.enabled) {
      res.status(400).json({ error: 'SSO is not configured' });
      return;
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');
    res.cookie('sso_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    const authorizeUrl = buildAuthorizeUrl(ssoConfig, state);
    res.json({ authorizeUrl });
  } catch (error) {
    console.error('SSO authorize error:', error);
    res.status(500).json({ error: 'Failed to initiate SSO' });
  }
});

/**
 * GET /sso/callback — Handle Entra ID redirect
 */
router.get('/sso/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      res.status(400).json({ error: `SSO error: ${oauthError}` });
      return;
    }

    // Validate state
    const savedState = req.cookies?.sso_state;
    if (!state || state !== savedState) {
      res.status(400).json({ error: 'Invalid SSO state — possible CSRF' });
      return;
    }
    res.clearCookie('sso_state');

    const ssoConfig = await getSsoConfig();
    if (!ssoConfig) {
      res.status(400).json({ error: 'SSO not configured' });
      return;
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(ssoConfig, code as string);

    // Decode ID token claims
    const claims = decodeIdToken(tokens.id_token);

    // Fetch profile + groups from Microsoft Graph
    const graphProfile = await fetchGraphProfile(tokens.access_token);

    // Upsert user in database
    const user = await upsertSsoUser(claims, graphProfile, ssoConfig);

    // Generate HydroBOS JWT
    const jwtToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      authProvider: 'entra_id',
    });

    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend
    res.redirect('/');
  } catch (error) {
    console.error('SSO callback error:', error);
    res.status(500).json({ error: 'SSO authentication failed' });
  }
});

export default router;
