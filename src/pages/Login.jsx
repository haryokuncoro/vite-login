import React from 'react';
import { useForm } from 'react-hook-form';
import { useAtom } from 'jotai';
import { rememberMeAtom, authAtom } from '../state/atoms';
import { login } from '../api/auth';
import { useNavigate, Link } from 'react-router-dom';
import AuthCard from '../components/AuthCard';

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [rememberMe, setRememberMe] = useAtom(rememberMeAtom);
  const [, setAuth] = useAtom(authAtom);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const resp = await login({ email: data.email, password: data.password, remember: rememberMe });
      // If backend requires 2FA
      if (resp.data.twoFaRequired) {
        // store minimal user info in local storage for 2FA verification step
        localStorage.setItem('pending_user_id', resp.data.user.id);
        localStorage.setItem('pending_user_email', resp.data.user.email);
        setAuth(source => ({ ...source, user: resp.data.user, twoFaRequired: true }));
        navigate('/two-factor');
        return;
      }
      // otherwise get token
      const token = resp.data.token;
      setAuth({ user: resp.data.user, token, twoFaRequired: false });
      if (rememberMe && token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user_email', resp.data.user.email || '');
      }
      navigate('/');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <AuthCard title="Sign in">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm">Email</label>
          <input className="mt-1 input" {...register('email', { required: 'Email required' })} />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm">Password</label>
          <input type="password" className="mt-1 input" {...register('password', { required: 'Password required' })} />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            <span className="text-sm">Remember me</span>
          </label>
          <Link to="/forgot" className="text-sm underline">Forgot?</Link>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-2 rounded-xl bg-slate-800 text-white">Sign in</button>

        <div className="text-sm text-center">
          Don't have an account? <Link to="/register" className="underline">Register</Link>
        </div>
      </form>
    </AuthCard>
  );
}
