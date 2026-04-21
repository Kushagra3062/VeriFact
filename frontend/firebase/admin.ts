import * as admin from 'firebase-admin';

// Initialize the app if it hasn't been already
const initializeFirebase = () => {
  try {
    if (admin.apps.length > 0) return admin.app();

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('[firebase-admin] Missing credentials. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY not found.');
      return null;
    }

    // Advanced cleaning for PEM key
    // 1. Remove surrounding quotes if present
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    // 2. Resolve escaped \n to actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    // 3. Remove any carriage returns (\r)
    privateKey = privateKey.replace(/\r/g, '');
    
    // 4. Ensure it has the correct header and footer if somehow lost (usually redundant but safe)
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}`;
    }
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
        privateKey = `${privateKey}\n-----END PRIVATE KEY-----\n`;
    }

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (err) {
    console.error('[firebase-admin] Critical Initialization error:', err);
    return null;
  }
};

// Initialize once at module level
initializeFirebase();

// Helper to get active admin services
export const getAdminAuth = () => {
  const app = admin.apps.length > 0 ? admin.app() : initializeFirebase();
  if (!app) throw new Error('Firebase Admin Auth not initialized.');
  return admin.auth(app);
};

export const getAdminDb = () => {
  const app = admin.apps.length > 0 ? admin.app() : initializeFirebase();
  if (!app) throw new Error('Firebase Admin Firestore not initialized.');
  return admin.firestore(app);
};

// Export properties that lazily resolve for backward compatibility
export const auth = {
  get createSessionCookie() { return getAdminAuth().createSessionCookie.bind(getAdminAuth()); },
  get getUserByEmail() { return getAdminAuth().getUserByEmail.bind(getAdminAuth()); },
  get verifySessionCookie() { return getAdminAuth().verifySessionCookie.bind(getAdminAuth()); },
} as any;

export const db = {
  collection: (path: string) => getAdminDb().collection(path),
} as any;
