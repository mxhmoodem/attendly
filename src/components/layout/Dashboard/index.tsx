import { Outlet } from 'react-router-dom';
import { Header } from '../Header';
import { Navbar } from '../Navbar';
import './Dashboard.css';

const DashboardLayout = () => {
  return (
    <div className="dashboard-layout">
      <Header />
      <Navbar />
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
