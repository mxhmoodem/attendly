import { useState } from 'react';
import { HiMail, HiLockClosed } from 'react-icons/hi';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { useAuthContext } from '../../../context/AuthContext';
import type { LoginFormData } from './models';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, loginWithGoogle, loginWithGithub } = useAuthContext();

  const handleChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      // Navigation will happen automatically after auth state changes
    } catch (err) {
      // Firebase specific error handling
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      if (errorMessage.includes('auth/invalid-credential') || errorMessage.includes('auth/user-not-found') || errorMessage.includes('auth/wrong-password')) {
        setError('Invalid email or password. Please try again.');
      } else if (errorMessage.includes('auth/too-many-requests')) {
        setError('Too many failed attempts. Please try again later.');
      } else if (errorMessage.includes('auth/network-request-failed')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('An error occurred. Please try again.');
      }
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
      // Navigation will happen automatically after auth state changes
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google login failed';
      if (errorMessage.includes('popup-closed-by-user')) {
        setError('Login cancelled. Please try again.');
      } else if (errorMessage.includes('network-request-failed')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Google login failed. Please try again.');
      }
      console.error('Google login failed:', err);
    }
  };

  const handleGithubLogin = async () => {
    setError('');
    try {
      await loginWithGithub();
      // Navigation will happen automatically after auth state changes
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'GitHub login failed';
      if (errorMessage.includes('popup-closed-by-user')) {
        setError('Login cancelled. Please try again.');
      } else if (errorMessage.includes('account-exists-with-different-credential')) {
        setError('An account already exists with this email using a different sign-in method.');
      } else if (errorMessage.includes('network-request-failed')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('GitHub login failed. Please try again.');
      }
      console.error('GitHub login failed:', err);
    }
  };

  const handleForgotPassword = () => {
    // TODO: Navigate to forgot password page
    console.log('Forgot password clicked');
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
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

        <div className="form-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) => handleChange('rememberMe', e.target.checked)}
              disabled={isLoading}
            />
            <span>Remember me</span>
          </label>
          <button
            type="button"
            className="forgot-password"
            onClick={handleForgotPassword}
            disabled={isLoading}
          >
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          className="submit-button primary"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        <div className="divider">
          <span>Or login with</span>
        </div>

        <div className="social-buttons">
          <button
            type="button"
            className="social-button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <FaGoogle size={20} />
            Google
          </button>
          <button
            type="button"
            className="social-button"
            onClick={handleGithubLogin}
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

export default Login;
