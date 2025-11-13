import React from 'react';
import { useAtom } from 'jotai';
import { authAtom } from '../state/atoms';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [auth, setAuth] = useAtom(authAtom);
  const navigate = useNavigate();

  const logout = () => {
    setAuth({ user: null, token: null, twoFaRequired: false });
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!auth.token) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow">
        <h2 className="text-xl font-semibold mb-4">You are not signed in</h2>
        <div className="flex gap-2">
          <button onClick={() => navigate('/login')} className="px-4 py-2 rounded bg-slate-800 text-white">Sign in</button>
          <button onClick={() => navigate('/register')} className="px-4 py-2 rounded border">Register</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow">
      <h2 className="text-xl font-semibold mb-4">Welcome, {auth.user?.email || auth.user?.name}</h2>
      <p className="mb-4 text-sm">Token: <span className="break-all">{auth.token}</span></p>
      <div className="flex gap-2">
        <button onClick={logout} className="px-4 py-2 rounded bg-red-500 text-white">Logout</button>
      </div>
    </div>
  );
}
