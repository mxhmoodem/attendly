import { useState } from 'react';
import Login from '../Login';
import Register from '../Register';
import './AuthPage.css';

type AuthTab = 'login' | 'register';

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  return (
    <div className="auth-page">
      <div className="auth-header">
        <h1 className="auth-title">attendly</h1>
        <p className="auth-subtitle">
          Sign in/up to enjoy the best work managing experience
        </p>
      </div>

      <div className="auth-container">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>

        <div className="auth-content">
          {activeTab === 'login' ? <Login /> : <Register />}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
