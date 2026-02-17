import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import './Navbar.css';

export const Navbar = () => {
  return (
    <nav className="app-navbar">
      <NavLink 
        to={ROUTES.LEAVE} 
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Leave
      </NavLink>
      <NavLink 
        to={ROUTES.OFFICE_TRACKER} 
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Office Tracker
      </NavLink>
      <NavLink 
        to={ROUTES.PROFILE} 
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Profile
      </NavLink>
    </nav>
  );
};
