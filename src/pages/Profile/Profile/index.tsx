import { useAuthContext } from '../../../context/AuthContext';

const Profile = () => {
  const { user } = useAuthContext();

  return (
    <div className="profile-page">
      <h1>Profile</h1>
      <p>Manage your profile information here.</p>
      {user && (
        <div>
          <p>Email: {user.email}</p>
        </div>
      )}
      {/* TODO: Implement profile management functionality */}
    </div>
  );
};

export default Profile;
