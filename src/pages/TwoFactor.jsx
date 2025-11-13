import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { verify2FA } from '../api/auth';
import AuthCard from '../components/AuthCard';
import { useAtomValue, useSetAtom } from 'jotai';
import { authAtom, authWritableAtom } from '../state/atoms'; // Import Writable Atom
import { useNavigate } from 'react-router-dom';

export default function TwoFactor() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  
  // Read state using the read-only atom
  const auth = useAtomValue(authAtom);
  // Get setter from the writable atom
  const setAuth = useSetAtom(authWritableAtom);
  const navigate = useNavigate();

  const [localError, setLocalError] = useState(null); 

  const onSubmit = async (data) => {
    setLocalError(null);
    try {
      // Note: userId is stored as a string in localStorage
      const userId = localStorage.getItem('pending_user_id'); 
      
      const resp = await verify2FA({ 
        userId: userId, 
        code: data.code,
        email: localStorage.getItem('pending_user_email')
      });
      
      const token = resp.data.token;
      
      // Update writable atom state
      setAuth(prev => ({ 
        ...prev, 
        token, 
        user: resp.data.user || auth.user, // Use returned user if provided, otherwise keep current
        twoFaRequired: false, 
        errorMessage: null 
      }));
      
      // Persist token and email in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user_email', resp.data.user?.email || localStorage.getItem('pending_user_email') || '');
      
      // clear pending credentials
      localStorage.removeItem('pending_user_id');
      localStorage.removeItem('pending_user_email');
      
      navigate('/');
      
    } catch (err) {
      const message = err?.response?.data?.message || '2FA verification failed. Check the code.';
      setLocalError(message);
      console.error('2FA Error:', err);
    }
  };
  
  // Get the pending email for display
  const pendingEmail = localStorage.getItem('pending_user_email');

  return (
    <AuthCard title="Two-factor verification">
      {localError && (
        <div role="alert" className="p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-xl mb-4">
          {localError}
        </div>
      )}
      <p className="mb-4 text-sm text-gray-700">
        We sent a verification code to 
        <span className="font-semibold text-slate-800"> {pendingEmail || 'your email'}</span>. 
        Enter the 6-digit code below.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Verification Code</label>
          <input 
            type="text"
            inputMode="numeric"
            maxLength="6"
            {...register('code', { 
              required: 'Code required',
              pattern: {
                value: /^\d{6}$/,
                message: 'Must be 6 digits'
              }
            })} 
            className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 text-center text-xl tracking-widest" 
          />
          {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code.message}</p>}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full py-3 font-semibold text-white transition duration-200 rounded-xl bg-slate-800 shadow-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Verifying...' : 'Verify'}
        </button>
      </form>
    </AuthCard>
  );
}