import React from 'react';
import { useForm } from 'react-hook-form';
import { registerUser } from '../api/auth';
import AuthCard from '../components/AuthCard';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await registerUser({ name: data.name, email: data.email, password: data.password });
      alert('Registered — check your email for 2FA/setup instructions (demo).');
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <AuthCard title="Create account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm">Name</label>
          <input {...register('name', { required: 'Name required' })} className="mt-1 input" />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm">Email</label>
          <input {...register('email', { required: 'Email required' })} className="mt-1 input" />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm">Password</label>
          <input type="password" {...register('password', { required: 'Password required', minLength: { value: 6, message: 'Min 6 characters' } })} className="mt-1 input" />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-2 rounded-xl bg-slate-800 text-white">Create account</button>

        <div className="text-sm text-center">
          Already have an account? <Link to="/login" className="underline">Sign in</Link>
        </div>
      </form>
    </AuthCard>
  );
}
