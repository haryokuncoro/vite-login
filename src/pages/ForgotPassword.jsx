import React from 'react';
import { useForm } from 'react-hook-form';
import { forgotPassword } from '../api/auth';
import AuthCard from '../components/AuthCard';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await forgotPassword({ email: data.email });
      alert('If that email exists, you will receive reset instructions (demo).');
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert('Request failed');
    }
  };

  return (
    <AuthCard title="Reset password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm">Email</label>
          <input {...register('email', { required: 'Email required' })} className="mt-1 input" />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-2 rounded-xl bg-slate-800 text-white">Send reset link</button>
      </form>
    </AuthCard>
  );
}
