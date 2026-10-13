
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import { isAdminUser } from '../../utils/admin';
import {
  FaEye,
  FaEyeSlash,
  FaLock,
  FaSignInAlt,
  FaTimes,
} from 'react-icons/fa';

const getBackendLoginMessage = (err) => {
  const data = err?.response?.data;
  const message = data?.detail ?? data?.message ?? data?.error;

  return typeof message === 'string' ? message : '';
};

const isUnregisteredAccountError = (message) =>
  /\b(user|account|email)\b.{0,50}\b(not found|does not exist|doesn't exist|not registered|isn't registered|is not registered)\b/i.test(message) ||
  /\b(not found|does not exist|doesn't exist|not registered|isn't registered|is not registered)\b.{0,50}\b(user|account|email)\b/i.test(message);

const isInvalidCredentialsError = (message) =>
  /invalid (email|password|credentials?)|incorrect (email|password|credentials?)|wrong password|authentication failed/i.test(message);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const notice = location.state?.message;

  const closeLogin = () => {
    if (isLoading) return;

    navigate('/', { replace: true });
    window.requestAnimationFrame(() => {
      const target = document.getElementById('landing-login');
      target?.focus();
    });
  };

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isLoading) {
        closeLogin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, showRegistrationPrompt]);

  useEffect(() => {
    const handleDialogTab = (event) => {
      if (event.key !== 'Tab' || showRegistrationPrompt) return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll(
          'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleDialogTab);
    return () => window.removeEventListener('keydown', handleDialogTab);
  }, [showRegistrationPrompt]);

  useEffect(() => {
    if (!showRegistrationPrompt) return undefined;

    const cancelButton = document.querySelector('.login-alert-cancel');
    cancelButton?.focus();

    const handlePromptKeyDown = (event) => {
      if (event.key !== 'Tab') return;

      const actions = Array.from(
        document.querySelectorAll('.login-alert-dialog button:not(:disabled)'),
      );
      if (!actions.length) return;

      if (event.shiftKey && document.activeElement === actions[0]) {
        event.preventDefault();
        actions[actions.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === actions[actions.length - 1]) {
        event.preventDefault();
        actions[0].focus();
      }
    };

    window.addEventListener('keydown', handlePromptKeyDown);
    return () => window.removeEventListener('keydown', handlePromptKeyDown);
  }, [showRegistrationPrompt]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setIsLoading(true);

    try {
      const loggedInUser = await login(email, password);

      // Admin -> Admin Dashboard
      // Normal user -> Resume Upload page
      navigate(
        isAdminUser(loggedInUser)
          ? '/admin/dashboard'
          : '/upload-resume'
      );
    } catch (err) {
      const backendMessage = getBackendLoginMessage(err);

      if (isUnregisteredAccountError(backendMessage)) {
        setError('');
        setShowRegistrationPrompt(true);
      } else if (isInvalidCredentialsError(backendMessage)) {
        setError('The email or password is incorrect. Please try again.');
      } else if (!err?.response) {
        setError('Unable to connect to the server. Check your connection and try again.');
      } else if (err.response.status >= 500) {
        setError('The server could not complete your login. Please try again later.');
      } else {
        setError(backendMessage || getApiErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="login-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeLogin();
      }}
    >
      <section
        className="login-modal-dialog"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-heading"
      >
        <button
          type="button"
          className="login-modal-close"
          onClick={closeLogin}
          aria-label="Close login"
          disabled={isLoading}
        >
          <FaTimes aria-hidden="true" />
        </button>
        <div className="login-layout login-modal-layout">

        {/* ================= LEFT SIDE ================= */}
        <div className="login-hero-panel">
          <div className="login-hero-content">

            <span className="login-kicker">
              🎯 skillEngine
            </span>

            <h1>Welcome to skillEngine</h1>

            <p className="login-hero-subtitle">
              AI-Powered Technical Interview Preparation Platform
            </p>

            <div className="login-feature-list">

              {[
                {
                  icon: '🤖',
                  title: 'AI-Powered',
                  desc: 'Smart question generation based on your resume',
                },
                {
                  icon: '🎤',
                  title: 'Voice-Based',
                  desc: 'Real interview simulation with voice interaction',
                },
                {
                  icon: '📊',
                  title: 'Detailed Reports',
                  desc: 'Comprehensive feedback and improvement areas',
                },
                {
                  icon: '🎯',
                  title: 'Personalized',
                  desc: 'Tailored questions based on your career goals',
                },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="login-feature-item"
                >
                  <span className="login-feature-icon">
                    {feature.icon}
                  </span>

                  <div className="min-w-0">
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDE ================= */}
        <div className="login-form-card">

          <div className="login-form-heading">

            <span className="login-lock-icon">
              <FaLock />
            </span>

            <div>
              <p className="login-form-eyebrow">
                skillEngine account
              </p>

              <h2 id="login-heading">Login</h2>
            </div>

          </div>

          {/* Success Message */}
          {notice && !error && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4">
              {notice}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-start space-x-2">
              <span className="text-lg">
                ⚠️
              </span>

              <span>
                {error}
              </span>
            </div>
          )}

          {/* ================= LOGIN FORM ================= */}
          <form
            onSubmit={handleSubmit}
            className="login-form-fields"
          >

            {/* Email */}
            <div>
              <label className="label-field" htmlFor="login-email">
                Email Address
              </label>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="label-field" htmlFor="login-password">
                Password
              </label>

              <div className="login-password-wrap">

                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((visible) => !visible)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <FaEyeSlash />
                  ) : (
                    <FaEye />
                  )}
                </button>

              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">

                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>

                  Logging in...

                </span>
              ) : (
                <>
                  <FaSignInAlt />
                  Login
                </>
              )}
            </button>

          </form>

          {/* Register */}
          <p className="login-register-prompt">
            Don't have an account?{' '}

            <Link
              to="/register"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Register here
            </Link>
          </p>

        </div>
        </div>
      </section>

      {showRegistrationPrompt && (
        <div
          className="login-alert-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeLogin();
            }
          }}
        >
          <section
            className="login-alert-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="register-prompt-title"
            aria-describedby="register-prompt-message"
          >
            <h2 id="register-prompt-title">Account not found</h2>
            <p id="register-prompt-message">
              You don't have an account yet. Please register first.
            </p>
            <div className="login-alert-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/register')}
              >
                Register Now
              </button>
              <button
                type="button"
                className="login-alert-cancel"
                onClick={closeLogin}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Login;



