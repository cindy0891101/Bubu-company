/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { OperationType, FirestoreErrorInfo } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize the Firebase app handler
const app = initializeApp(firebaseConfig);

// Initialize Firestore specifying db instance identifier (Critical constraint!)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Setup secure anonymous authentication
export async function ensureAuth() {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const credential = await signInAnonymously(auth);
    return credential.user;
  } catch (error) {
    console.error("Firebase Anonymous Auth failed to initial launch:", error);
    throw error;
  }
}

// Global firestore diagnostics exception mapping
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test helper
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client is offline.");
    }
  }
}

testConnection();
