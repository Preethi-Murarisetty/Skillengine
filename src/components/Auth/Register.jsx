import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage, verifyRegistrationOtp, resendRegistrationOtp } from '../../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    location: '',
    password: '',
    confirmPassword: '',
    currentRole: '',
    experienceYears: 0,
    educationLevel: "Bachelor's Degree",
    careerGoal: 'Frontend Developer',
    interests: [],
    learningGoals: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('form'); // 'form' -> 'otp'
  const [otp, setOtp] = useState('');
  const [info, setInfo] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const careerGoals = [
    'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'DevOps Engineer', 'Data Scientist', 'Machine Learning Engineer',
    'Cloud Architect', 'Mobile Developer', 'Security Engineer',
    'Technical Lead', 'Product Manager', 'Software Architect', 'Other'
  ];

  const interestsOptions = [
    'Web Development', 'Mobile Development', 'Cloud Computing',
    'Artificial Intelligence', 'Machine Learning', 'Data Science',
    'Cybersecurity', 'DevOps', 'Blockchain', 'IoT', 'Game Development',
    'Open Source', 'System Design', 'Database Management', 'UI/UX Design'
  ];

  const lettersOnly = /^[A-Za-z ]*$/;
  const fullNamePattern = /^[A-Za-z. ]*$/;
  const digitsOnly = /^\d*$/;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (checked && !formData.interests.includes(value) && formData.interests.length >= 5) {
        setError('You can select a maximum of 5 technical interests.');
        return;
      }

      setFormData(prev => ({
        ...prev,
        interests: checked 
          ? [...prev.interests, value]
          : prev.interests.filter(i => i !== value)
      }));
      setError('');
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else if (name === 'fullName') {
      if (fullNamePattern.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === 'currentRole') {
      if (lettersOnly.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === 'phone') {
      if (digitsOnly.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!fullNamePattern.test(formData.fullName) || !formData.fullName.trim()) {
      setError('Full name can contain letters, spaces, and periods only.');
      return;
    }

    if (formData.currentRole && !lettersOnly.test(formData.currentRole)) {
      setError('Current role can contain letters and spaces only.');
      return;
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Phone number must contain exactly 10 digits.');
      return;
    }

    setIsLoading(true);
    try {
      await register(formData);
      setInfo(`We sent a 6-digit verification code to ${formData.email}. It expires in 5 minutes.`);
      setStep('otp');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);
    try {
      await verifyRegistrationOtp(formData.email, otp);
      navigate('/login', {
        state: {
          message: 'Email verified! Please login.',
          returnTo: location.state?.returnTo || location.pathname,
        },
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setIsLoading(true);
    try {
      await resendRegistrationOtp(formData.email);
      setInfo('A new verification code has been sent.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="card">
          <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
          {info && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4">{info}</div>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{error}</div>}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="label-field">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="input-field"
                placeholder="6-digit code"
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isLoading || otp.length !== 6}>
              {isLoading ? 'Verifying...' : 'Verify & continue'}
            </button>
            <button type="button" onClick={handleResend} className="w-full text-indigo-600 font-semibold hover:underline" disabled={isLoading}>
              Resend code
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="gradient-hero rounded-3xl p-8 text-center text-white mb-8">
        <h1 className="text-3xl font-bold">📝 Create Your Account</h1>
        <p className="text-white/90">Start your journey to interview success</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start space-x-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="label-field">Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="input-field"
                required
                disabled={isLoading}
                pattern="[A-Za-z. ]+"
                title="Use letters, spaces, and periods only"
              />
            </div>
            
            <div>
              <label className="label-field">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="label-field">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                disabled={isLoading}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="10"
                required
                title="Enter exactly 10 digits"
              />
            </div>
            
            <div>
              <label className="label-field">Current Role</label>
              <input
                type="text"
                name="currentRole"
                value={formData.currentRole}
                onChange={handleChange}
                className="input-field"
                disabled={isLoading}
                placeholder="e.g., Software Engineer"
                pattern="[A-Za-z ]*"
                title="Use letters and spaces only"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="label-field">Date of Birth *</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className="input-field"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="label-field">Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="input-field"
                required
                disabled={isLoading}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label-field">Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="input-field"
                placeholder="City, State"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="label-field">Years of Experience</label>
              <input
                type="number"
                name="experienceYears"
                value={formData.experienceYears}
                onChange={handleChange}
                min="0"
                max="50"
                className="input-field"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="label-field">Education Level</label>
              <select
                name="educationLevel"
                value={formData.educationLevel}
                onChange={handleChange}
                className="input-field"
                disabled={isLoading}
              >
                <option value="High School">High School</option>
                <option value="Bachelor's Degree">Bachelor's Degree</option>
                <option value="Master's Degree">Master's Degree</option>
                <option value="PhD">PhD</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="label-field">Career Goal</label>
              <select
                name="careerGoal"
                value={formData.careerGoal}
                onChange={handleChange}
                className="input-field"
                disabled={isLoading}
              >
                {careerGoals.map(goal => (
                  <option key={goal} value={goal}>{goal}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label-field">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                required
                disabled={isLoading}
                minLength="6"
              />
            </div>
          </div>

          <div>
            <label className="label-field">Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-field"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="label-field mb-2">Technical Interests (select up to 5)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {interestsOptions.map(interest => (
                <label key={interest} className="flex items-center space-x-2 hover:bg-indigo-50 p-2 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    value={interest}
                    checked={formData.interests.includes(interest)}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    disabled={isLoading}
                  />
                  <span className="text-sm">{interest}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label-field">What are you currently learning?</label>
            <textarea
              name="learningGoals"
              value={formData.learningGoals}
              onChange={handleChange}
              rows="3"
              className="input-field"
              disabled={isLoading}
              placeholder="Share what technologies or skills you're currently working on..."
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>
        
        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;