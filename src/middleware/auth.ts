import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import jwt from 'jsonwebtoken';
import { getOrCreateGoogleUser } from '../db/users.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'student-attendance-system-super-secret-key-123';

export interface AuthUser {
  id: number;
  uid?: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  
  // 1. Try verifying as local Custom JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.id) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
      };
      return next();
    }
  } catch (jwtErr) {
    // If verification fails, it might be a Firebase token. Proceed to Firebase verify.
  }

  // 2. Try verifying as Firebase ID Token
  try {
    const decodedFirebase = await adminAuth.verifyIdToken(token);
    // Find or create the user record in PostgreSQL
    const dbUser = await getOrCreateGoogleUser(
      decodedFirebase.uid,
      decodedFirebase.email || '',
      decodedFirebase.name || decodedFirebase.email?.split('@')[0] || 'Google User'
    );
    
    req.user = {
      id: dbUser.id,
      uid: dbUser.uid || undefined,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as 'admin' | 'teacher' | 'student',
    };
    next();
  } catch (firebaseErr) {
    console.error('Auth verification failed:', firebaseErr);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireRole = (roles: Array<'admin' | 'teacher' | 'student'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user found in request' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires one of roles: ${roles.join(', ')}` });
    }
    next();
  };
};
