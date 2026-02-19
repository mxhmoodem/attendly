import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  deleteUser as deleteFirebaseUser,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../services/firebase';
import { AuthContext, type User } from './AuthContext';
import { getDocument, setDocument, deleteDocument } from '../services/database';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Try to load user profile from Firestore
        try {
          const userProfile = await getDocument<User>('users', firebaseUser.uid);
          
          // Determine sign-in method
          let signInMethod: 'google' | 'microsoft' | 'email' | 'github' = 'email';
          if (firebaseUser.providerData[0]) {
            const providerId = firebaseUser.providerData[0].providerId;
            if (providerId.includes('google')) signInMethod = 'google';
            else if (providerId.includes('microsoft')) signInMethod = 'microsoft';
            else if (providerId.includes('github')) signInMethod = 'github';
          }
          
          setUser({
            email: firebaseUser.email || '',
            uid: firebaseUser.uid,
            displayName: userProfile?.displayName || firebaseUser.displayName || undefined,
            photoURL: userProfile?.photoURL || firebaseUser.photoURL || undefined,
            signInMethod,
            company: userProfile?.company,
            role: userProfile?.role,
            country: userProfile?.country,
          });
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Fallback to basic user data
          setUser({
            email: firebaseUser.email || '',
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || undefined,
            photoURL: firebaseUser.photoURL || undefined,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser({
        email: userCredential.user.email || '',
        uid: userCredential.user.uid
      });
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to log in');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      // Persist a default profile document so downstream reads always find it
      await setDocument('users', uid, {
        uid,
        email,
        role: 'employee',
        isActive: true,
      }, false);

      setUser({ email, uid, role: 'employee' });
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to register');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to log out');
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const { uid, email, displayName, photoURL } = result.user;

      // Load existing profile; create one with defaults on first social sign-in
      let profile = await getDocument<User>('users', uid);
      if (!profile) {
        const newProfile = {
          uid,
          email: email || '',
          displayName: displayName || undefined,
          photoURL: photoURL || undefined,
          role: 'employee',
          isActive: true,
        };
        await setDocument('users', uid, newProfile, false);
        profile = newProfile as User;
      }

      setUser({
        email: email || '',
        uid,
        displayName: profile.displayName || displayName || undefined,
        photoURL: profile.photoURL || photoURL || undefined,
        signInMethod: 'google',
        company: profile.company,
        role: profile.role,
        country: profile.country,
      });
    } catch (error) {
      console.error('Google login error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to login with Google');
    }
  };

  const loginWithGithub = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const { uid, email, displayName, photoURL } = result.user;

      // Load existing profile; create one with defaults on first social sign-in
      let profile = await getDocument<User>('users', uid);
      if (!profile) {
        const newProfile = {
          uid,
          email: email || '',
          displayName: displayName || undefined,
          photoURL: photoURL || undefined,
          role: 'employee',
          isActive: true,
        };
        await setDocument('users', uid, newProfile, false);
        profile = newProfile as User;
      }

      setUser({
        email: email || '',
        uid,
        displayName: profile.displayName || displayName || undefined,
        photoURL: profile.photoURL || photoURL || undefined,
        signInMethod: 'github',
        company: profile.company,
        role: profile.role,
        country: profile.country,
      });
    } catch (error) {
      console.error('GitHub login error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to login with GitHub');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Firestore rejects undefined values — omit any key whose value is undefined
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      ) as Partial<User>;
      await setDocument('users', user.uid, clean, true);
      setUser({ ...user, ...clean });
    } catch (error) {
      console.error('Update profile error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update profile');
    }
  };

  const deleteAccount = async () => {
    if (!user || !auth.currentUser) throw new Error('No user logged in');
    
    try {
      // Delete user data from Firestore
      await deleteDocument('users', user.uid);
      // Delete Firebase Auth account
      await deleteFirebaseUser(auth.currentUser);
      setUser(null);
    } catch (error) {
      console.error('Delete account error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete account');
    }
  };

  const value = { 
    user, 
    login, 
    register, 
    loginWithGoogle, 
    loginWithGithub, 
    logout, 
    deleteAccount,
    updateProfile,
    loading 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}