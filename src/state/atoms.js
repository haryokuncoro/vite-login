import { atom } from 'jotai';

// --- INITIAL STATE LOADER ---
// Function to load initial state from localStorage
const loadInitialAuthState = () => {
  const token = localStorage.getItem('token');
  const userEmail = localStorage.getItem('user_email');

  return {
    token: token || null,
    // Only set user object if a token exists
    user: token && userEmail ? { email: userEmail } : null,
    twoFaRequired: false,
    errorMessage: null, // New field for transient error messages
  };
};


// 1. PRIMARY Writable Atom (This is the one you will use to SET the state)
// It initializes state from localStorage but can be written to directly.
export const authWritableAtom = atom(loadInitialAuthState());


// 2. Convenience Read-Only Atom (Optional, but useful for reading)
// This atom simply returns the current value of the writable atom.
export const authAtom = atom((get) => get(authWritableAtom));


// 3. Simple Writable Atom for Remember Me
export const rememberMeAtom = atom(false);