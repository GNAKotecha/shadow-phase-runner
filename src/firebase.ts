import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  GoogleAuthProvider, 
  OAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  User,
  UserCredential
} from 'firebase/auth';
import { getFirestore, doc, getDoc, runTransaction, collection, query, orderBy, limit, getDocs, updateDoc, where, Transaction, QueryDocumentSnapshot, onSnapshot, getCountFromServer, setDoc } from 'firebase/firestore';
import { firebasePublicConfig } from './firebaseConfig.js';

// When using NodeNext module resolution, .js extensions are required in import paths from TS files.
// The consuming files import this as './firebase.js'.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebasePublicConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebasePublicConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebasePublicConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebasePublicConfig.appId,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebasePublicConfig.messagingSenderId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebasePublicConfig.storageBucket,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebasePublicConfig.measurementId,
};

console.log('[FB] Raw config loaded', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.slice(0, 8) + '***' : undefined
});

export const app = initializeApp(firebaseConfig);
console.log('[FB] App initialized');
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function ensureAnonAuth() {
  if (!auth.currentUser) {
    console.log('[FB] Signing in anonymously...');
    try {
      await signInAnonymously(auth);
      console.log('[FB] Anonymous auth success uid=', (auth.currentUser as any)?.uid);
    } catch (e) {
      console.error('[FB] Anonymous auth FAILED', e);
      throw e;
    }
  }
  return auth.currentUser!;
}

// Enhanced Authentication Methods

export interface AuthResult {
  user: User;
  isNewUser: boolean;
  credential?: UserCredential;
}

// Google Sign-In
export async function signInWithGoogle(): Promise<AuthResult> {
  console.log('[AUTH] Starting Google Sign-In...');
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('[AUTH] Google Sign-In success:', result.user.uid);
    
    // Check if user exists in our system
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);
    const isNewUser = !userSnap.exists();
    
    if (isNewUser) {
      // Create user profile for new Google users
      const displayName = result.user.displayName || result.user.email?.split('@')[0] || 'Player';
      const username = sanitizeUsername(displayName);
      await createUserProfile(result.user.uid, {
        username: username,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        provider: 'google'
      });
    }
    
    return { user: result.user, isNewUser, credential: result };
  } catch (error) {
    console.error('[AUTH] Google Sign-In failed:', error);
    throw error;
  }
}

// Apple Sign-In
export async function signInWithApple(): Promise<AuthResult> {
  console.log('[AUTH] Starting Apple Sign-In...');
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('[AUTH] Apple Sign-In success:', result.user.uid);
    
    // Check if user exists in our system
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);
    const isNewUser = !userSnap.exists();
    
    if (isNewUser) {
      // Create user profile for new Apple users
      const displayName = result.user.displayName || result.user.email?.split('@')[0] || 'Player';
      const username = sanitizeUsername(displayName);
      await createUserProfile(result.user.uid, {
        username: username,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        provider: 'apple'
      });
    }
    
    return { user: result.user, isNewUser, credential: result };
  } catch (error) {
    console.error('[AUTH] Apple Sign-In failed:', error);
    throw error;
  }
}

// Email/Password Registration
export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<AuthResult> {
  console.log('[AUTH] Starting email registration for:', email);
  
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log('[AUTH] Email registration success:', result.user.uid);
    
    // Update user profile with display name
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    
    // Create user profile in Firestore
    const username = sanitizeUsername(displayName || email.split('@')[0]);
    await createUserProfile(result.user.uid, {
      username: username,
      email: email,
      displayName: displayName,
      provider: 'email'
    });
    
    return { user: result.user, isNewUser: true, credential: result };
  } catch (error) {
    console.error('[AUTH] Email registration failed:', error);
    throw error;
  }
}

// Email/Password Sign-In
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  console.log('[AUTH] Starting email sign-in for:', email);
  
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('[AUTH] Email sign-in success:', result.user.uid);
    
    // Check if user profile exists
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);
    const isNewUser = !userSnap.exists();
    
    return { user: result.user, isNewUser, credential: result };
  } catch (error) {
    console.error('[AUTH] Email sign-in failed:', error);
    throw error;
  }
}

// Password Reset
export async function resetPassword(email: string): Promise<void> {
  console.log('[AUTH] Sending password reset email to:', email);
  
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('[AUTH] Password reset email sent successfully');
  } catch (error) {
    console.error('[AUTH] Password reset failed:', error);
    throw error;
  }
}

// Sign Out
export async function signOutUser(): Promise<void> {
  console.log('[AUTH] Signing out user');
  
  try {
    await signOut(auth);
    console.log('[AUTH] Sign out successful');
    // Clear local storage
    localStorage.removeItem('spr_username');
  } catch (error) {
    console.error('[AUTH] Sign out failed:', error);
    throw error;
  }
}

// Create user profile in Firestore
async function createUserProfile(uid: string, data: {
  username: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  provider: string;
}): Promise<void> {
  const userRef = doc(db, 'users', uid);
  
  try {
    await setDoc(userRef, {
      ...data,
      bestScore: 0,
      gamesPlayed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    // Try to register the username
    if (data.username) {
      const success = await registerUsername(data.username, uid);
      if (!success) {
        // If username is taken, add a number
        for (let i = 1; i <= 99; i++) {
          const altUsername = `${data.username}${i}`;
          const altSuccess = await registerUsername(altUsername, uid);
          if (altSuccess) {
            // Update user record with the modified username
            await updateDoc(userRef, { username: altUsername });
            break;
          }
        }
      }
    }
    
    console.log('[AUTH] User profile created successfully');
  } catch (error) {
    console.error('[AUTH] Failed to create user profile:', error);
    throw error;
  }
}

// Get current user's profile
export async function getUserProfile(uid?: string): Promise<any | null> {
  const userId = uid || auth.currentUser?.uid;
  if (!userId) return null;
  
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userId, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('[AUTH] Failed to get user profile:', error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(updates: {
  displayName?: string;
  photoURL?: string;
  username?: string;
}): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  
  try {
    // Update Firebase Auth profile
    if (updates.displayName !== undefined || updates.photoURL !== undefined) {
      await updateProfile(user, {
        displayName: updates.displayName,
        photoURL: updates.photoURL
      });
    }
    
    // Update Firestore profile
    const userRef = doc(db, 'users', user.uid);
    const firestoreUpdates: any = {
      updatedAt: Date.now()
    };
    
    if (updates.displayName !== undefined) {
      firestoreUpdates.displayName = updates.displayName;
    }
    if (updates.photoURL !== undefined) {
      firestoreUpdates.photoURL = updates.photoURL;
    }
    if (updates.username !== undefined) {
      firestoreUpdates.username = updates.username;
    }
    
    await updateDoc(userRef, firestoreUpdates);
    console.log('[AUTH] User profile updated successfully');
    return true;
  } catch (error) {
    console.error('[AUTH] Failed to update user profile:', error);
    return false;
  }
}

export function sanitizeUsername(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 12);
}

export async function registerUsername(uname: string, uid: string) {
  const cleaned = sanitizeUsername(uname);
  if (cleaned.length < 3) return false;
  const unameRef = doc(db, 'usernames', cleaned);
  const userRef = doc(db, 'users', uid);
  try {
    await runTransaction(db, async (trx: Transaction) => {
      const unameSnap = await trx.get(unameRef);
      if (unameSnap.exists()) throw new Error('taken');
      trx.set(unameRef, { uid });
      trx.set(userRef, { username: cleaned, bestScore: 0, createdAt: Date.now(), updatedAt: Date.now() });
    });
    localStorage.setItem('spr_username', cleaned);
    return true;
  } catch (e) {
    return false;
  }
}

export async function validateCachedUsername(uname: string): Promise<boolean> {
  try {
    await ensureAnonAuth();
    const cleaned = sanitizeUsername(uname);
    if (!cleaned) return false;
    const uid = auth.currentUser!.uid;
    const unameRef = doc(db, 'usernames', cleaned);
    const userRef = doc(db, 'users', uid);
    const [unameSnap, userSnap] = await Promise.all([getDoc(unameRef), getDoc(userRef)]);
    if (!unameSnap.exists() || !userSnap.exists()) return false;
    const data: any = unameSnap.data();
    if (data.uid !== uid) return false;
    const udata: any = userSnap.data();
    return udata && udata.username === cleaned;
  } catch {
    return false;
  }
}

export async function claimUsername(promptFn: (p: string) => Promise<string | null> | string | null) {
  await ensureAnonAuth();
  const uid = auth.currentUser!.uid;
  const stored = localStorage.getItem('spr_username');
  if (stored) {
    // Validate that mapping + user doc exist & consistent; otherwise try to register again.
    const unameRef = doc(db, 'usernames', stored);
    const userRef = doc(db, 'users', uid);
    try {
      const [unameSnap, userSnap] = await Promise.all([getDoc(unameRef), getDoc(userRef)]);
      if (unameSnap.exists() && (unameSnap.data() as any).uid === uid && userSnap.exists()) {
        console.log('[FB] Cached username validated in Firestore', stored);
        return stored;
      } else {
        console.warn('[FB] Cached username not backed by Firestore docs, attempting re-registration');
        const ok = await registerUsername(stored, uid);
        if (ok) { console.log('[FB] Re-registered cached username'); return stored; }
        console.warn('[FB] Re-registration failed; clearing cached username');
        localStorage.removeItem('spr_username');
      }
    } catch (e) {
      console.error('[FB] Validation of cached username failed', e);
      localStorage.removeItem('spr_username');
    }
  }
  while (true) {
    const input = await Promise.resolve(promptFn('Enter username (a-z 0-9 _):'));
    console.log('[FB] Username prompt input=', input);
    if (!input) { console.warn('[FB] Empty username input, re-prompt'); continue; }
    const uname = sanitizeUsername(input);
    if (uname.length < 3) { console.warn('[FB] Username too short', uname); continue; }
    const success = await registerUsername(uname, uid);
    if (success) {
      localStorage.setItem('spr_username', uname);
      console.log('[FB] Username registered =>', uname);
      return uname;
    }
    console.warn('[FB] Username taken, retry', uname);
  }
}

export async function submitScore(score: number) {
  await ensureAnonAuth();
  const uid = auth.currentUser!.uid;
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) { console.warn('[FB] submitScore: user doc missing; attempting to create stub'); return null; }
    const data: any = snap.data();
    const prev = data.bestScore || 0;
    if (score > prev) {
      console.log('[FB] Updating bestScore', { prev, score });
      await updateDoc(userRef, { bestScore: score, updatedAt: Date.now() });
      return score;
    } else {
      console.log('[FB] Score not higher, skip update', { score, prev });
      return prev;
    }
  } catch (e) {
    console.error('[FB] submitScore error', e);
    return null;
  }
}

export async function getUserBest(): Promise<number> {
  try {
    await ensureAnonAuth();
    const uid = auth.currentUser!.uid;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return 0;
    const data: any = snap.data();
    return data.bestScore || 0;
  } catch (e) {
    console.error('[FB] getUserBest error', e);
    return 0;
  }
}

export interface LeaderboardEntry { username: string; bestScore: number; }

export async function fetchTop(limitN = 10): Promise<LeaderboardEntry[]> {
  console.log('[FB] fetchTop start limit', limitN);
  try {
    const q = query(collection(db, 'users'), orderBy('bestScore', 'desc'), limit(limitN));
    const snaps = await getDocs(q);
    const res = snaps.docs.map((d: QueryDocumentSnapshot) => {
      const data: any = d.data();
      return { username: data.username, bestScore: data.bestScore || 0 };
    });
    console.log('[FB] fetchTop got', res.length, 'entries');
    return res;
  } catch (e) {
    console.error('[FB] fetchTop error', e);
    throw e;
  }
}

export function subscribeTop(limitN = 10, cb: (entries: LeaderboardEntry[]) => void) {
  console.log('[FB] subscribeTop attach');
  const q = query(collection(db, 'users'), orderBy('bestScore', 'desc'), limit(limitN));
  return onSnapshot(q, snap => {
    const list = snap.docs.map((d: QueryDocumentSnapshot) => {
      const data: any = d.data();
      return { username: data.username, bestScore: data.bestScore || 0 } as LeaderboardEntry;
    });
    console.log('[FB] subscribeTop update size=', list.length);
    cb(list);
  }, err => {
    console.error('[FB] subscribeTop error', err);
    cb([]);
  });
}

export async function fetchSelfRank(): Promise<{ rank: number; bestScore: number } | null> {
  try {
    await ensureAnonAuth();
    const uid = auth.currentUser!.uid;
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) { console.warn('[FB] fetchSelfRank: user doc missing'); return null; }
    const myScore = (snap.data() as any).bestScore || 0;
    const higherQ = query(collection(db, 'users'), where('bestScore', '>', myScore));
    const countSnap = await getCountFromServer(higherQ).catch(() => null as any);
    const higher = countSnap ? countSnap.data().count : 0;
    const rank = higher + 1;
    console.log('[FB] fetchSelfRank rank', { rank, myScore });
    return { rank, bestScore: myScore };
  } catch (e) {
    console.error('[FB] fetchSelfRank error', e);
    return null;
  }
}

export async function changeUsername(newNameRaw: string): Promise<boolean> {
  await ensureAnonAuth();
  const uid = getAuth().currentUser!.uid;
  const newName = newNameRaw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 12);
  if (newName.length < 3) { console.warn('[FB] changeUsername invalid length', newName); return false; }
  const userRef = doc(getFirestore(), 'users', uid);
  const newUnameRef = doc(getFirestore(), 'usernames', newName);
  try {
    await runTransaction(getFirestore(), async (trx: Transaction) => {
      const unameSnap = await trx.get(newUnameRef);
      if (unameSnap.exists()) throw new Error('taken');
      const userSnap = await trx.get(userRef);
      if (!userSnap.exists()) throw new Error('nouser');
      trx.set(newUnameRef, { uid });
      const data: any = userSnap.data();
      trx.update(userRef, { username: newName, updatedAt: Date.now(), bestScore: data.bestScore || 0 });
    });
    localStorage.setItem('spr_username', newName);
    console.log('[FB] changeUsername success', newName);
    return true;
  } catch (e) {
    console.error('[FB] changeUsername failed', e);
    return false;
  }
}

export function subscribeSelfRank(cb: (r: { rank: number; bestScore: number } | null) => void) {
  let innerUnsub: (() => void) | null = null;
  let cancelled = false;
  ensureAnonAuth().then(() => {
    if (cancelled) return;
    const uid = getAuth().currentUser!.uid;
    const userRef = doc(getFirestore(), 'users', uid);
    innerUnsub = onSnapshot(userRef, async snap => {
      if (!snap.exists()) { cb(null); return; }
      const myScore = (snap.data() as any).bestScore || 0;
      const higherQ = query(collection(getFirestore(), 'users'), where('bestScore', '>', myScore));
      try {
        const countSnap = await getCountFromServer(higherQ);
        const rank = countSnap.data().count + 1;
        cb({ rank, bestScore: myScore });
      } catch (e) {
        console.error('[FB] subscribeSelfRank count error', e);
        cb({ rank: 1, bestScore: myScore });
      }
    }, err => {
      console.error('[FB] subscribeSelfRank doc listener error', err);
      cb(null);
    });
  }).catch(e => {
    console.error('[FB] subscribeSelfRank ensure auth failed', e);
    cb(null);
  });
  return () => { cancelled = true; if (innerUnsub) try { innerUnsub(); } catch {} };
}
