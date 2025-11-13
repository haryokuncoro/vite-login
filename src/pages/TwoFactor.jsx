import React from 'react';
import { useForm } from 'react-hook-form';
import { verify2FA } from '../api/auth';
import AuthCard from '../components/AuthCard';
import { useAtom } from 'jotai';
import { authAtom } from '../state/atoms';
import { useNavigate } from 'react-router-dom';

export default function TwoFactor() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [auth, setAuth] = useAtom(authAtom);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const userId = localStorage.getItem('pending_user_id');
      const resp = await verify2FA({ userId: Number(userId), code: data.code });
      const token = resp.data.token;
      setAuth(prev => ({ ...prev, token, twoFaRequired: false }));
      localStorage.setItem('token', token);
      localStorage.setItem('user_email', localStorage.getItem('pending_user_email') || '');
      // clear pending
      localStorage.removeItem('pending_user_id');
      localStorage.removeItem('pending_user_email');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || '2FA verification failed');
    }
  };

  return (
    <AuthCard title="Two-factor verification">
      <p className="mb-4 text-sm">We sent a verification code to your email. Enter it below.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm">Code</label>
          <input {...register('code', { required: 'Code required' })} className="mt-1 input" />
          {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-2 rounded-xl bg-slate-800 text-white">Verify</button>
      </form>
    </AuthCard>
  );
}
