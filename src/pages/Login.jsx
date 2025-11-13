import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAtom, useSetAtom } from 'jotai';
import { rememberMeAtom, authWritableAtom } from '../state/atoms'; 
import { login } from '../api/auth';
import { useNavigate, Link } from 'react-router-dom';
import AuthCard from '../components/AuthCard';

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  
  const [rememberMe, setRememberMe] = useAtom(rememberMeAtom);
  // Using useSetAtom with the Writable Atom
  const setAuth = useSetAtom(authWritableAtom); 
  const navigate = useNavigate();
  
  const [localError, setLocalError] = useState(null); 

  // Custom function to handle local storage based on rememberMe status
  const manageLocalStorage = (token, email, shouldRemember) => {
    if (shouldRemember) {
      localStorage.setItem('token', token);
      localStorage.setItem('user_email', email || '');
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user_email');
    }
  };

  const onSubmit = async (data) => {
    setLocalError(null); 
    
    try {
      const resp = await login({ email: data.email, password: data.password, remember: rememberMe });
      const { token, user, twoFaRequired } = resp.data;
      
      if (twoFaRequired) {
        // Handle 2FA required state: save pending user info to be read by the 2FA component
        localStorage.setItem('pending_user_id', user.id);
        localStorage.setItem('pending_user_email', user.email);
        
        setAuth({ 
            user: { id: user.id, email: user.email }, // Set minimal user info
            token: null, 
            twoFaRequired: true, 
            errorMessage: null 
        });
        
        navigate('/two-factor');
        return;
      }
      
      // Handle successful login without 2FA
      
      // 1. Manage local storage persistence
      manageLocalStorage(token, user.email, rememberMe);
      
      // 2. Update Jotai state
      setAuth({ 
          user, 
          token, 
          twoFaRequired: false, 
          errorMessage: null 
      });
      
      navigate('/');
      
    } catch (err) {
      const message = err?.response?.data?.message || 'Login failed. Please check your credentials.';
      setLocalError(message); 
      console.error('Login Error:', err);
    }
  };

  return (
    <AuthCard title="Sign in">
      {localError && (
        <div role="alert" className="p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-xl mb-4">
          {localError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500" 
            {...register('email', { required: 'Email required' })} 
          />
          {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500" 
            {...register('password', { required: 'Password required' })} 
          />
          {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-slate-600 border-gray-300 rounded focus:ring-slate-500" 
              checked={rememberMe} 
              onChange={(e) => setRememberMe(e.target.checked)} 
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>
          <Link to="/forgot" className="text-sm text-slate-600 hover:text-slate-800 underline">Forgot password?</Link>
        </div>

        <button type="submit" 
          disabled={isSubmitting} 
          className="w-full py-3 font-semibold text-white transition duration-200 rounded-xl bg-slate-800 shadow-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="text-sm text-center text-gray-600">
          Don't have an account? <Link to="/register" className="text-slate-600 hover:text-slate-800 underline font-medium">Register</Link>
        </div>
      </form>
    </AuthCard>
  );
}