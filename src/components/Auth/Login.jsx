
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getApiErrorMessage,
  requestPasswordReset,
  resetPassword,
} from '../../services/api';
import { isAdminUser } from '../../utils/admin';
import BrandLogo from '../common/BrandLogo';
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

const getPasswordRecoveryError = (error, stage) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const backendMessage =
    typeof data === 'string'
      ? data
      : data?.message ??
        data?.detail ??
        data?.error ??
        (Array.isArray(data?.errors)
          ? data.errors.map((item) => item?.message || item?.msg || item).join(' ')
          : '');
  const readableBackendMessage = Array.isArray(backendMessage)
    ? backendMessage
      .map((item) => (typeof item === 'string' ? item : item?.msg || item?.message))
      .filter(Boolean)
      .join(' ')
    : backendMessage;

  if (status === 429) {
    return readableBackendMessage || 'Too many attempts. Please wait before trying again.';
  }
  if (typeof readableBackendMessage === 'string' && readableBackendMessage.trim()) {
    return readableBackendMessage;
  }
  if (!error?.response) {
    return 'Unable to connect to the server. Check your connection and try again.';
  }
  if (status >= 500) {
    return 'The server could not complete your request. Please try again later.';
  }
  if (stage === 'reset' && [400, 401, 404, 410, 422].includes(status)) {
    return 'The OTP may be invalid or expired. Check the code or request a new one.';
  }
  return getApiErrorMessage(error);
};

const isRecoveryRequestRejected = (response) =>
  response?.success === false ||
  response?.ok === false ||
  ['error', 'failed', 'failure'].includes(String(response?.status || '').toLowerCase());

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState('login');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const dialogRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const recoveryRequestInFlightRef = useRef(false);
  const mountedRef = useRef(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const notice = location.state?.message;
  const recoveryBusy = isLoading || recoveryLoading;

  const closeLogin = () => {
    if (recoveryBusy) return;

    navigate('/', { replace: true });
    window.requestAnimationFrame(() => {
      const target = document.getElementById('landing-login');
      target?.focus();
    });
  };

  useEffect(() => {
    mountedRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    return () => {
      mountedRef.current = false;
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !recoveryBusy) {
        closeLogin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recoveryBusy, showRegistrationPrompt]);

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
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
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
      if (!mountedRef.current) return;
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
      requestInFlightRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const openPasswordRecovery = () => {
    setRecoveryEmail(email);
    setRecoveryOtp('');
    setRecoveryPassword('');
    setRecoveryConfirmPassword('');
    setRecoveryError('');
    setRecoveryMessage('');
    setRecoveryStep('email');
  };

  const handleRequestPasswordReset = async (event) => {
    event.preventDefault();
    if (recoveryRequestInFlightRef.current) return;

    const normalizedEmail = recoveryEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setRecoveryError('Enter a valid email address.');
      return;
    }

    recoveryRequestInFlightRef.current = true;
    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoveryMessage('');
    try {
      const response = await requestPasswordReset(normalizedEmail);
      if (isRecoveryRequestRejected(response)) {
        const failure = new Error(response?.message || response?.detail || 'Password reset email could not be sent.');
        failure.response = { status: response?.statusCode || 400, data: response };
        throw failure;
      }

      if (!mountedRef.current) return;
      setRecoveryEmail(normalizedEmail);
      setRecoveryMessage('If an account exists for this email, an OTP has been sent. Check your inbox and spam folder.');
      setRecoveryStep('otp');
    } catch (requestError) {
      if (mountedRef.current) {
        setRecoveryError(getPasswordRecoveryError(requestError, 'email'));
      }
    } finally {
      recoveryRequestInFlightRef.current = false;
      if (mountedRef.current) setRecoveryLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (recoveryRequestInFlightRef.current) return;

    if (!/^\d{6}$/.test(recoveryOtp)) {
      setRecoveryError('Enter the six-digit OTP from your email.');
      return;
    }
    if (recoveryPassword.length < 8) {
      setRecoveryError('Your new password must be at least 8 characters long.');
      return;
    }
    if (recoveryPassword !== recoveryConfirmPassword) {
      setRecoveryError('The password fields do not match.');
      return;
    }

    recoveryRequestInFlightRef.current = true;
    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoveryMessage('');
    try {
      const response = await resetPassword(
        recoveryEmail,
        recoveryOtp,
        recoveryPassword,
      );
      if (isRecoveryRequestRejected(response)) {
        const failure = new Error(response?.message || response?.detail || 'Password could not be reset.');
        failure.response = { status: response?.statusCode || 400, data: response };
        throw failure;
      }

      if (!mountedRef.current) return;
      setRecoveryOtp('');
      setRecoveryPassword('');
      setRecoveryConfirmPassword('');
      setRecoveryMessage('Your password has been reset. You can now sign in with your new password.');
      setRecoveryStep('success');
    } catch (requestError) {
      if (mountedRef.current) {
        setRecoveryError(getPasswordRecoveryError(requestError, 'reset'));
      }
    } finally {
      recoveryRequestInFlightRef.current = false;
      if (mountedRef.current) setRecoveryLoading(false);
    }
  };

  const returnToLogin = () => {
    setEmail(recoveryEmail);
    setPassword('');
    setRecoveryOtp('');
    setRecoveryPassword('');
    setRecoveryConfirmPassword('');
    setRecoveryError('');
    setRecoveryMessage('');
    setRecoveryStep('login');
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
          disabled={recoveryBusy}
        >
          <FaTimes aria-hidden="true" />
        </button>
        <div className="login-layout login-modal-layout">

        {/* ================= LEFT SIDE ================= */}
        <div className="login-hero-panel">
          <div className="login-hero-content">

            <span className="login-kicker">
              <BrandLogo variant="mark" className="login-brand-mark" />
              SkillEngine
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

              <h2 id="login-heading">
                {recoveryStep === 'login'
                  ? 'Login'
                  : recoveryStep === 'success'
                    ? 'Password reset'
                    : 'Forgot password'}
              </h2>
            </div>

          </div>

          {recoveryStep === 'login' ? (
            <>
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
              <div className="login-password-label-row">
                <label className="label-field" htmlFor="login-password">
                  Password
                </label>
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={openPasswordRecovery}
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>
              </div>

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
            </>
          ) : (
            <div className="login-recovery-content">
              <p className="login-recovery-description">
                {recoveryStep === 'email'
                  ? 'Enter the email address associated with your account to request a password reset code.'
                  : recoveryStep === 'otp'
                    ? `Enter the six-digit code sent to ${recoveryEmail}.`
                    : 'Your password has been updated. You can now sign in securely.'}
              </p>

              {recoveryMessage && (
                <div className="login-recovery-message" role="status">
                  {recoveryMessage}
                </div>
              )}
              {recoveryError && (
                <div className="login-recovery-error" role="alert">
                  {recoveryError}
                </div>
              )}

              {recoveryStep === 'email' && (
                <form onSubmit={handleRequestPasswordReset} className="login-form-fields">
                  <div>
                    <label className="label-field" htmlFor="recovery-email">
                      Email Address
                    </label>
                    <input
                      id="recovery-email"
                      type="email"
                      value={recoveryEmail}
                      onChange={(event) => setRecoveryEmail(event.target.value)}
                      className="input-field"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      disabled={recoveryLoading}
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full" disabled={recoveryLoading}>
                    {recoveryLoading ? (
                      <span className="login-recovery-submit">
                        <span className="login-recovery-spinner" aria-hidden="true" />
                        Sending code...
                      </span>
                    ) : 'Send OTP'}
                  </button>
                  <button type="button" className="login-recovery-back" onClick={returnToLogin} disabled={recoveryLoading}>
                    Back to Login
                  </button>
                </form>
              )}

              {recoveryStep === 'otp' && (
                <form onSubmit={handleResetPassword} className="login-form-fields">
                  <div>
                    <label className="label-field" htmlFor="recovery-otp">
                      Six-digit OTP
                    </label>
                    <input
                      id="recovery-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={recoveryOtp}
                      onChange={(event) => setRecoveryOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input-field"
                      placeholder="Enter OTP"
                      required
                      disabled={recoveryLoading}
                    />
                  </div>
                  <div>
                    <label className="label-field" htmlFor="recovery-password">
                      New Password
                    </label>
                    <input
                      id="recovery-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={recoveryPassword}
                      onChange={(event) => setRecoveryPassword(event.target.value)}
                      className="input-field"
                      placeholder="At least 8 characters"
                      required
                      disabled={recoveryLoading}
                    />
                  </div>
                  <div>
                    <label className="label-field" htmlFor="recovery-confirm-password">
                      Confirm New Password
                    </label>
                    <input
                      id="recovery-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={recoveryConfirmPassword}
                      onChange={(event) => setRecoveryConfirmPassword(event.target.value)}
                      className="input-field"
                      placeholder="Re-enter your new password"
                      required
                      disabled={recoveryLoading}
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full" disabled={recoveryLoading}>
                    {recoveryLoading ? (
                      <span className="login-recovery-submit">
                        <span className="login-recovery-spinner" aria-hidden="true" />
                        Resetting password...
                      </span>
                    ) : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    className="login-recovery-back"
                    onClick={() => {
                      setRecoveryOtp('');
                      setRecoveryPassword('');
                      setRecoveryConfirmPassword('');
                      setRecoveryError('');
                      setRecoveryMessage('');
                      setRecoveryStep('email');
                    }}
                    disabled={recoveryLoading}
                  >
                    Request a new code
                  </button>
                </form>
              )}

              {recoveryStep === 'success' && (
                <button type="button" className="btn-primary w-full" onClick={returnToLogin}>
                  Back to Login
                </button>
              )}
            </div>
          )}
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
