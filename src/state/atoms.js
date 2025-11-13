import { atom } from 'jotai';

export const authAtom = atom(() => {
  const token = localStorage.getItem('token');
  return { user: token ? { email: localStorage.getItem('user_email') } : null, token: token || null, twoFaRequired: false };
});
export const rememberMeAtom = atom(false);
