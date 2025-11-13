import React from 'react';

export default function AuthCard({ children, title }) {
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
