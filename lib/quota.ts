'use client';

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// === QUOTA CONFIGURATION ===
const GUEST_DAILY_LIMIT = 10;      // Guest (tanpa login): 10 pesan/hari
const USER_DAILY_LIMIT = 30;       // Login (akun biasa): 30 pesan/hari
const ROOT_EMAIL = 'johsua092@gmail.com'; // ROOT: unlimited

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  isRoot: boolean;
  resetDate: string; // YYYY-MM-DD
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getQuotaDocPath(identifier: string): string {
  return `quotas/${identifier}`;
}

/**
 * Get current quota info for a user/device
 */
export async function getQuotaInfo(
  userId: string | null,
  userEmail: string | null,
  deviceId: string | null
): Promise<QuotaInfo> {
  // Root user = unlimited
  if (userEmail && (userEmail === ROOT_EMAIL || userEmail.includes('johsua092'))) {
    return {
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      isRoot: true,
      resetDate: getTodayDate(),
    };
  }

  const isLoggedIn = !!userId;
  const identifier = userId || deviceId || 'anonymous';
  const limit = isLoggedIn ? USER_DAILY_LIMIT : GUEST_DAILY_LIMIT;
  const today = getTodayDate();

  try {
    const quotaRef = doc(db, getQuotaDocPath(identifier));
    const quotaSnap = await getDoc(quotaRef);

    if (quotaSnap.exists()) {
      const data = quotaSnap.data();
      // Reset if it's a new day
      if (data.date !== today) {
        return {
          used: 0,
          limit,
          remaining: limit,
          isRoot: false,
          resetDate: today,
        };
      }
      const used = data.count || 0;
      return {
        used,
        limit,
        remaining: Math.max(0, limit - used),
        isRoot: false,
        resetDate: today,
      };
    }

    // No record yet
    return {
      used: 0,
      limit,
      remaining: limit,
      isRoot: false,
      resetDate: today,
    };
  } catch (error) {
    console.error('Error reading quota:', error);
    // If we can't read quota, allow with full limit (graceful fallback)
    return {
      used: 0,
      limit,
      remaining: limit,
      isRoot: false,
      resetDate: today,
    };
  }
}

/**
 * Consume 1 quota point. Returns true if allowed, false if over limit.
 */
export async function consumeQuota(
  userId: string | null,
  userEmail: string | null,
  deviceId: string | null
): Promise<{ allowed: boolean; quotaInfo: QuotaInfo }> {
  // Root user = always allowed
  if (userEmail && (userEmail === ROOT_EMAIL || userEmail.includes('johsua092'))) {
    return {
      allowed: true,
      quotaInfo: {
        used: 0,
        limit: Infinity,
        remaining: Infinity,
        isRoot: true,
        resetDate: getTodayDate(),
      },
    };
  }

  const isLoggedIn = !!userId;
  const identifier = userId || deviceId || 'anonymous';
  const limit = isLoggedIn ? USER_DAILY_LIMIT : GUEST_DAILY_LIMIT;
  const today = getTodayDate();

  try {
    const quotaRef = doc(db, getQuotaDocPath(identifier));
    const quotaSnap = await getDoc(quotaRef);

    let currentCount = 0;

    if (quotaSnap.exists()) {
      const data = quotaSnap.data();
      if (data.date === today) {
        currentCount = data.count || 0;
      }
      // If different day, reset to 0
    }

    // Check if over limit
    if (currentCount >= limit) {
      return {
        allowed: false,
        quotaInfo: {
          used: currentCount,
          limit,
          remaining: 0,
          isRoot: false,
          resetDate: today,
        },
      };
    }

    // Increment quota
    const newCount = currentCount + 1;
    await setDoc(quotaRef, {
      count: newCount,
      date: today,
      type: isLoggedIn ? 'user' : 'guest',
      updatedAt: serverTimestamp(),
    });

    return {
      allowed: true,
      quotaInfo: {
        used: newCount,
        limit,
        remaining: Math.max(0, limit - newCount),
        isRoot: false,
        resetDate: today,
      },
    };
  } catch (error) {
    console.error('Error consuming quota:', error);
    // Graceful fallback: allow the message
    return {
      allowed: true,
      quotaInfo: {
        used: 0,
        limit,
        remaining: limit,
        isRoot: false,
        resetDate: today,
      },
    };
  }
}

export { GUEST_DAILY_LIMIT, USER_DAILY_LIMIT, ROOT_EMAIL };
