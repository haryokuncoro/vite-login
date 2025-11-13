import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { authAtom, authWritableAtom } from '../state/atoms'; // Import both atoms
import { useNavigate } from 'react-router-dom';

export default function Home() {
  // 1. Read the state using the read-only atom (authAtom)
  const auth = useAtomValue(authAtom);
  
  // 2. Get the setter from the Writable Atom (authWritableAtom)
  const setAuth = useSetAtom(authWritableAtom);
  
  const navigate = useNavigate();

  const logout = () => {
    // Use the setter from the writable atom
    setAuth({ user: null, token: null, twoFaRequired: false, errorMessage: null }); 
    
    // Clear all persistent data
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
    
    navigate('/login');
  };

  if (!auth.token) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow">
        <h2 className="text-xl font-semibold mb-4">You are not signed in</h2>
        <div className="flex gap-2">
          <button onClick={() => navigate('/login')} className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-700 transition">Sign in</button>
          <button onClick={() => navigate('/register')} className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition">Register</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Welcome, {auth.user?.email || 'User'}!</h2>
      <p className="mb-6 text-sm text-gray-600">You are securely authenticated.</p>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
        <h3 className="text-md font-semibold mb-2">Current Token:</h3>
        <p className="break-all text-xs font-mono text-gray-700 select-all">{auth.token}</p>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={logout} 
          className="px-6 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition shadow-md"
        >
          Logout
        </button>
        <button 
          className="px-6 py-2 rounded-xl bg-slate-100 text-slate-800 font-semibold border border-slate-300 hover:bg-slate-200 transition"
          disabled
        >
          Protected Action (Mock)
        </button>
      </div>
    </div>
  );
}