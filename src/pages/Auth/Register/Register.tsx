import { useState } from 'react';
import { HiMail, HiLockClosed } from 'react-icons/hi';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { useAuthContext } from '../../../context/AuthContext';
import type { RegisterFormData } from './models';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, loginWithGoogle, loginWithGithub } = useAuthContext();

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = (): boolean => {
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await register(formData.email, formData.password);
      // Navigation will happen automatically after auth state changes
    } catch (err) {
      // Firebase specific error handling
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      if (errorMessage.includes('auth/email-already-in-use')) {
        setError('This email is already registered. Please login instead.');
      } else if (errorMessage.includes('auth/weak-password')) {
        setError('Password is too weak. Please use a stronger password.');
      } else if (errorMessage.includes('auth/invalid-email')) {
        setError('Invalid email address. Please check and try again.');
      } else if (errorMessage.includes('auth/network-request-failed')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Registration failed. Please try again.');
      }
      console.error('Registration failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    try {
      await loginWithGoogle();
      // Navigation will happen automatically after auth state changes
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google signup failed';
      if (errorMessage.includes('popup-closed-by-user')) {
        setError('Signup cancelled. Please try again.');
      } else if (errorMessage.includes('network-request-failed')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Google signup failed. Please try again.');
      }
      console.error('Google signup failed:', err);
    }
  };

  const handleGithubSignup = async () => {
    setError('');
    try {
      await loginWithGithub();
      // Navigation will happen automatically after auth state changes
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'GitHub signup failed';
      if (errorMessage.includes('popup-closed-by-user')) {
        setError('Signup cancelled. Please try again.');
      } else if (errorMessage.includes('account-exists-with-different-credential')) {
        setError('An account already exists with this email using a different sign-in method.');
      } else if (errorMessage.includes('network-request-failed')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('GitHub signup failed. Please try again.');
      }
      console.error('GitHub signup failed:', err);
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}

        <div className="input-group">
          <div className="input-icon">
            <HiMail size={24} color="#6B7280" />
          </div>
          <div className="input-wrapper">
            <label className="input-label">Email Address</label>
            <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                disabled={isLoading}
            />
          </div>
        </div>

        <div className="input-group">
          <div className="input-icon">
            <HiLockClosed size={24} color="#6B7280" />
          </div>
          <div className="input-wrapper">
            <label className="input-label">Password</label>
            <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                disabled={isLoading}
            />
          </div>
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? (
              <AiOutlineEye size={24} color="#6B7280" />
            ) : (
              <AiOutlineEyeInvisible size={24} color="#6B7280" />
            )}
          </button>
        </div>

        <div className="input-group">
          <div className="input-icon">
            <HiLockClosed size={24} color="#6B7280" />
          </div>
          <div className="input-wrapper">
            <label className="input-label">Confirm Password</label>
            <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                required
                disabled={isLoading}
            />
          </div>
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isLoading}
          >
            {showConfirmPassword ? (
              <AiOutlineEye size={24} color="#6B7280" />
            ) : (
              <AiOutlineEyeInvisible size={24} color="#6B7280" />
            )}
          </button>
        </div>

        <button
          type="submit"
          className="submit-button primary"
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Register'}
        </button>

        <div className="divider">
          <span>Or sign up with</span>
        </div>

        <div className="social-buttons">
          <button
            type="button"
            className="social-button"
            onClick={handleGoogleSignup}
            disabled={isLoading}
          >
            <FaGoogle size={20} />
            Google
          </button>
          <button
            type="button"
            className="social-button"
            onClick={handleGithubSignup}
            disabled={isLoading}
          >
            <FaGithub size={20} />
            GitHub
          </button>
        </div>
      </form>
    </div>
  );
};

export default Register;
