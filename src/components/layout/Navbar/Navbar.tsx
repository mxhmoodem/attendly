import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { AiOutlineHome, AiFillHome } from 'react-icons/ai';
import { MdOutlineWorkOutline, MdWork } from 'react-icons/md';
import { BiCalendar, BiCalendarCheck } from 'react-icons/bi';
import { HiOutlineUser, HiUser } from 'react-icons/hi';
import './Navbar.css';

export const Navbar = () => {
  return (
    <nav className="app-navbar">
      <NavLink 
        to={ROUTES.APP_ROOT} 
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        end
      >
        {({ isActive }) => (
          <>
            {isActive ? <AiFillHome className="nav-icon" /> : <AiOutlineHome className="nav-icon" />}
            <span className="nav-text">Home</span>
          </>
        )}
      </NavLink>
      
      <NavLink 
        to={ROUTES.OFFICE_TRACKER} 
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        {({ isActive }) => (
          <>
            {isActive ? <MdWork className="nav-icon" /> : <MdOutlineWorkOutline className="nav-icon" />}
            <span className="nav-text">Office Tracker</span>
          </>
        )}
      </NavLink>
      
      <NavLink 
        to={ROUTES.LEAVE} 
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        {({ isActive }) => (
          <>
            {isActive ? <BiCalendarCheck className="nav-icon" /> : <BiCalendar className="nav-icon" />}
            <span className="nav-text">Leave</span>
          </>
        )}
      </NavLink>
      
      <NavLink 
        to={ROUTES.PROFILE} 
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        {({ isActive }) => (
          <>
            {isActive ? <HiUser className="nav-icon" /> : <HiOutlineUser className="nav-icon" />}
            <span className="nav-text">Profile</span>
          </>
        )}
      </NavLink>
    </nav>
  );
};
