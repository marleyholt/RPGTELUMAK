import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigLocal from '../firebase-applet-config.json';

// Forçar uso do projeto original finlhub a partir do json base
const firebaseConfig = {
  apiKey: firebaseConfigLocal.apiKey,
  authDomain: firebaseConfigLocal.authDomain,
  projectId: firebaseConfigLocal.projectId,
  storageBucket: firebaseConfigLocal.storageBucket,
  messagingSenderId: firebaseConfigLocal.messagingSenderId,
  appId: firebaseConfigLocal.appId,
  measurementId: firebaseConfigLocal.measurementId,
};

const firestoreDatabaseId = firebaseConfigLocal.firestoreDatabaseId;

const app = initializeApp(firebaseConfig);

// CRITICAL: Bind to the correct dynamic firestore database ID
export const db = getFirestore(app, firestoreDatabaseId || undefined);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Prevent Google Auth accounts with different domains from being blocked, configure cleanly
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
};
