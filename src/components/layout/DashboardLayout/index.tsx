import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  return (
    <div className="dashboard-layout">
      <header>
        <h1>Attendly Dashboard</h1>
      </header>
      <nav>
        {/* TODO: Add navigation */}
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
