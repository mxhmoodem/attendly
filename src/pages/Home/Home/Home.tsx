import './Home.css';

export const Home = () => {
  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Welcome to Attendly</h1>
        <p className="home-subtitle">Manage your attendance and leave requests</p>
      </div>

      <div className="home-cards">
        <div className="home-card">
          <div className="card-icon">📅</div>
          <h3>Leave Management</h3>
          <p>Submit and track your leave requests</p>
        </div>

        <div className="home-card">
          <div className="card-icon">🏢</div>
          <h3>Office Tracker</h3>
          <p>Track your office attendance and remote work</p>
        </div>

        <div className="home-card">
          <div className="card-icon">👤</div>
          <h3>Profile</h3>
          <p>Manage your account settings</p>
        </div>
      </div>
    </div>
  );
};
