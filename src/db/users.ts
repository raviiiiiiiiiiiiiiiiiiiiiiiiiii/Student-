import { db } from './index.ts';
import { users } from './schema.ts';
import { eq, or } from 'drizzle-orm';

export async function getOrCreateGoogleUser(uid: string, email: string, name: string) {
  try {
    // 1. Check if user already exists by uid or email
    const existing = await db
      .select()
      .from(users)
      .where(or(eq(users.uid, uid), eq(users.email, email)))
      .limit(1);

    if (existing.length > 0) {
      const user = existing[0];
      // If found but doesn't have UID (e.g. registered locally first), link it
      if (!user.uid) {
        const [updated] = await db
          .update(users)
          .set({ uid })
          .where(eq(users.id, user.id))
          .returning();
        return updated;
      }
      return user;
    }

    // Determine default role based on email pattern
    let role: 'admin' | 'teacher' | 'student' = 'student';
    const emailLower = email.toLowerCase();
    if (emailLower.startsWith('admin') || emailLower.includes('principal')) {
      role = 'admin';
    } else if (emailLower.startsWith('teacher') || emailLower.includes('professor')) {
      role = 'teacher';
    }

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        uid,
        email,
        name,
        role,
      })
      .returning();

    return newUser;
  } catch (error) {
    console.error('Error in getOrCreateGoogleUser:', error);
    throw new Error('Failed to retrieve or register user in database', { cause: error });
  }
}

export async function getUserById(id: number) {
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw new Error('Failed to fetch user', { cause: error });
  }
}

export async function getUserByEmail(email: string) {
  try {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw new Error('Failed to fetch user', { cause: error });
  }
}

export async function getUserByUsername(username: string) {
  try {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching user by username:', error);
    throw new Error('Failed to fetch user', { cause: error });
  }
}
