import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../../context/AuthContext';
import './Header.css';

export const Header = () => {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">attendly</h1>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
