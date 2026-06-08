'use client';

import React, { useState, useEffect } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; email: string; history: string[] }) => void;
  triggerToast: (msg: string) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess, triggerToast }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear errors and input fields when opening/closing
  useEffect(() => {
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  }, [isOpen, isSignUp]);

  if (!isOpen) return null;

  // Local storage credentials logic
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    // Get current registered users
    const usersStr = localStorage.getItem('eventline_users') || '[]';
    let users = [];
    try {
      users = JSON.parse(usersStr);
    } catch {
      users = [];
    }

    if (isSignUp) {
      // Sign Up validation
      if (!name.trim()) {
        setError('Please enter your name.');
        setLoading(false);
        return;
      }

      const userExists = users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (userExists) {
        setError('An account with this email already exists.');
        setLoading(false);
        return;
      }

      // Create new user record
      const newUser = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        history: [],
      };

      users.push(newUser);
      localStorage.setItem('eventline_users', JSON.stringify(users));

      // Log in immediately
      const sessionUser = { name: newUser.name, email: newUser.email, history: [] };
      localStorage.setItem('eventline_session', JSON.stringify(sessionUser));
      
      triggerToast('Account created successfully!');
      onSuccess(sessionUser);
      onClose();
    } else {
      // Sign In validation
      const matchedUser = users.find(
        (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (!matchedUser) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      // Log in
      const sessionUser = {
        name: matchedUser.name,
        email: matchedUser.email,
        history: matchedUser.history || [],
      };
      localStorage.setItem('eventline_session', JSON.stringify(sessionUser));

      triggerToast('Signed in successfully!');
      onSuccess(sessionUser);
      onClose();
    }

    setLoading(false);
  };

  // Mock Google Sign-In Flow
  const handleGoogleSignIn = () => {
    setLoading(true);
    setError('');
    
    // Simulate a secure popup delay
    setTimeout(() => {
      const googleUser = {
        name: 'Google explorer',
        email: 'google-user@gmail.com',
        history: [],
      };

      // Register Google User if not already registered locally
      const usersStr = localStorage.getItem('eventline_users') || '[]';
      let users = [];
      try {
        users = JSON.parse(usersStr);
      } catch {
        users = [];
      }

      const matchIndex = users.findIndex((u: any) => u.email === googleUser.email);
      if (matchIndex === -1) {
        users.push({ ...googleUser, password: 'google-oauth-token-dummy' });
        localStorage.setItem('eventline_users', JSON.stringify(users));
      } else {
        googleUser.history = users[matchIndex].history || [];
      }

      localStorage.setItem('eventline_session', JSON.stringify(googleUser));
      
      triggerToast('Signed in with Google!');
      onSuccess(googleUser);
      onClose();
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-fadeIn">
      {/* Modal Card */}
      <div className="relative w-full max-w-sm p-6 bg-[#0c0c0c] rounded-3xl border border-[#2a2a2a] shadow-2xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[#161616] p-1.5 rounded-full border border-[#2a2a2a] hover:border-red-500/20 hover:text-red-400 transition-all duration-200 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo / Header */}
        <div className="text-center mt-2 mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome to <span className="gradient-text">EventLine</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1.5">Sign in to save your event search history.</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#121212] border border-[#222] rounded-xl p-1 mb-5">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isSignUp ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isSignUp ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-xl text-center animate-shake">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4.5">
          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-[#121212] border border-[#222] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-[#121212] border border-[#222] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#121212] border border-[#222] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-3 rounded-xl border border-blue-500/35 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/10 transition-all duration-200 mt-2 disabled:opacity-50"
          >
            {loading && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="h-[1px] flex-1 bg-[#222]" />
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">or</span>
          <div className="h-[1px] flex-1 bg-[#222]" />
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          disabled={loading}
          className="w-full bg-[#111] hover:bg-[#161616] text-gray-300 hover:text-white border border-[#2a2a2a] font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50"
        >
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
