// ─────────────────────────────────────────────────────────────────────────────
// DSA ROOM SECURITY MIDDLEWARE & UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const rateLimit = require('express-rate-limit');
const sanitize = require('mongo-sanitize');
const xss = require('xss');

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────────

const socketRateLimit = new Map(); // userId -> { count, resetTime }

function checkSocketRateLimit(userId, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const record = socketRateLimit.get(userId) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    // Reset window
    socketRateLimit.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limited
  }

  record.count++;
  socketRateLimit.set(userId, record);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT VALIDATION & SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────

function validateRoomJoin(data) {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid request' };
  if (!data.roomCode || typeof data.roomCode !== 'string' || data.roomCode.length > 20)
    return { valid: false, error: 'Invalid room code' };
  if (!data.username || typeof data.username !== 'string' || data.username.length > 100)
    return { valid: false, error: 'Invalid username' };

  return { valid: true, roomCode: sanitize(data.roomCode), username: xss(data.username) };
}

function validateCodeSubmission(data) {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid request' };
  if (!data.code || typeof data.code !== 'string' || data.code.length > 100000)
    return { valid: false, error: 'Code too long (max 100KB)' };
  if (!data.language || !['javascript', 'python', 'java', 'cpp', 'c'].includes(data.language))
    return { valid: false, error: 'Invalid language' };

  return { valid: true, code: data.code, language: data.language };
}

function validateVote(data) {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid request' };
  if (!data.voteType || typeof data.voteType !== 'string')
    return { valid: false, error: 'Invalid vote type' };
  if (!data.voteValue || typeof data.voteValue !== 'string')
    return { valid: false, error: 'Invalid vote value' };

  const validVotes = {
    questionMode: ['same', 'different'],
    timeLimit: ['30', '45', '60'],
  };

  if (validVotes[data.voteType] && !validVotes[data.voteType].includes(data.voteValue)) {
    return { valid: false, error: 'Invalid vote value for type' };
  }

  return { valid: true, voteType: data.voteType, voteValue: data.voteValue };
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET.IO MIDDLEWARE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function setupSocketSecurityMiddleware(io) {
  // Connection middleware
  io.use((socket, next) => {
    // Check origin (CORS)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    ];

    const origin = socket.handshake.headers.origin;
    if (!allowedOrigins.includes(origin)) {
      return next(new Error('CORS policy violation'));
    }

    // Validate socket query params
    const { username, userId } = socket.handshake.query;
    if (!username || typeof username !== 'string' || username.length > 100) {
      return next(new Error('Invalid username in handshake'));
    }

    // Store sanitized data
    socket.username = xss(username);
    socket.userId = userId || `guest-${socket.id.substring(0, 8)}`;
    socket.joinedAt = new Date();

    next();
  });

  return io;
}

// Event middleware for rate limiting
function withRateLimit(handler, maxRequests = 10, windowMs = 60000) {
  return (socket, data, callback) => {
    if (!checkSocketRateLimit(socket.userId, maxRequests, windowMs)) {
      return callback({ error: 'Too many requests. Please slow down.' });
    }
    return handler(socket, data, callback);
  };
}

// Event middleware for validation
function withValidation(handler, validator) {
  return (socket, data, callback) => {
    const result = validator(data);
    if (!result.valid) {
      return callback({ error: result.error });
    }
    return handler(socket, { ...result }, callback);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY HEADERS MIDDLEWARE (for Express)
// ─────────────────────────────────────────────────────────────────────────────

function securityHeaders(req, res, next) {
  // CORS
  res.header('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

async function verifyAuthToken(token) {
  try {
    // This would verify Firebase token in production
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // return decodedToken;

    // For demo: simple token validation
    if (!token || typeof token !== 'string') return null;
    return { uid: token, email: `user-${token.substring(0, 8)}@.local` };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INJECTION & ATTACK PREVENTION
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeInput(input) {
  if (typeof input === 'string') {
    return xss(sanitize(input));
  }
  if (typeof input === 'object' && input !== null) {
    return JSON.parse(JSON.stringify(input));
  }
  return input;
}

function preventCodeInjection(code) {
  // Check for dangerous patterns
  const dangerousPatterns = [
    /require\s*\(\s*['"]fs['\"]\s*\)/,
    /import\s+.*\s+from\s+['"]fs['\"]/,
    /process\.exit|process\.kill/,
    /eval\s*\(/,
    /Function\s*\(/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { safe: false, message: 'Code contains potentially dangerous operations' };
    }
  }

  return { safe: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROLE VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

function withAdminCheck(handler) {
  return (socket, data, callback) => {
    // Check if user is room host/admin
    if (socket.isAdmin !== true && socket.role !== 'host') {
      return callback({ error: 'Admin-only action' });
    }
    return handler(socket, data, callback);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  checkSocketRateLimit,
  validateRoomJoin,
  validateCodeSubmission,
  validateVote,
  setupSocketSecurityMiddleware,
  withRateLimit,
  withValidation,
  securityHeaders,
  verifyAuthToken,
  sanitizeInput,
  preventCodeInjection,
  withAdminCheck,
};
