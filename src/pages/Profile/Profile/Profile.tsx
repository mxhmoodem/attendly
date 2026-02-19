import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdEmail } from 'react-icons/md';
import { FcGoogle } from 'react-icons/fc';
import { FaMicrosoft } from 'react-icons/fa6';
import { FaGithub } from 'react-icons/fa';
import { useAuthContext } from '../../../context/AuthContext';
import './Profile.css';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Côte d\'Ivoire', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hong Kong', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Macao', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen',
  'Zambia', 'Zimbabwe',
];

/** Compress and resize an image file to a base64 data URL (max 256 × 256, quality 0.8) */
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Profile = () => {
  const { user, logout, deleteAccount, updateProfile } = useAuthContext();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [company, setCompany] = useState(user?.company || '');
  const [role, setRole] = useState(user?.role || '');
  const [country, setCountry] = useState(user?.country || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getInitials = () => {
    const name = displayName || user?.email || '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let photoURL = user.photoURL;

      // Compress selected image and store as base64 in Firestore
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        photoURL = await compressImage(file);
        setAvatarPreview(photoURL);
      }

      await updateProfile({ displayName, company, role, country, photoURL });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      navigate('/auth/login');
    } catch (error) {
      console.error('Delete account failed:', error);
      alert('Failed to delete account. You may need to re-login before deleting.');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!user) return <div className="profile-loading">Loading...</div>;

  const getSignInBadge = () => {
    const method = user.signInMethod || 'email';
    const iconProps = { size: 16, style: { marginRight: '0.35rem' } };
    
    switch (method) {
      case 'google':
        return <><FcGoogle {...iconProps} /> Google</>;
      case 'microsoft':
        return <><FaMicrosoft {...iconProps} style={{ ...iconProps.style, color: '#0078d4' }} /> Microsoft</>;
      case 'github':
        return <><FaGithub {...iconProps} /> GitHub</>;
      default:
        return <><MdEmail {...iconProps} /> Email & Password</>;
    }
  };

  return (
    <div className="profile-page">
      {/* Avatar Section */}
      <div className="profile-avatar-section">
        <div className="profile-avatar-wrapper" onClick={handleAvatarClick}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-initials">{getInitials()}</div>
          )}
          <div className="profile-avatar-overlay">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 15.2A3.2 3.2 0 1 1 15.2 12 3.2 3.2 0 0 1 12 15.2zm0-4.8A1.6 1.6 0 1 0 13.6 12 1.6 1.6 0 0 0 12 10.4z"/>
              <path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3zm3 14a5 5 0 1 1 5-5 5 5 0 0 1-5 5z"/>
            </svg>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
      </div>

      {/* Account Info Card */}
      <div className="profile-card">
        <p className="card-section-label">Account</p>

        <div className="profile-input-group">
          <label className="profile-input-label">Full Name</label>
          <input
            className="profile-input"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className="profile-input-group">
          <label className="profile-input-label">Email</label>
          <input
            className="profile-input profile-input-readonly"
            type="email"
            value={user.email}
            readOnly
          />
        </div>

        <div className="profile-input-group">
          <label className="profile-input-label">Sign-in Method</label>
          <div className="profile-signin-badge">{getSignInBadge()}</div>
        </div>
      </div>

      {/* Work Info Card */}
      <div className="profile-card">
        <p className="card-section-label">Work</p>

        <div className="profile-input-group">
          <label className="profile-input-label">Company</label>
          <input
            className="profile-input"
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="Your company"
          />
        </div>

        <div className="profile-input-group">
          <label className="profile-input-label">Role</label>
          <input
            className="profile-input"
            type="text"
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="Your role"
          />
        </div>

        <div className="profile-input-group">
          <label className="profile-input-label">Country</label>
          <select
            className="profile-input profile-select"
            value={country}
            onChange={e => setCountry(e.target.value)}
          >
            <option value="">Select your country</option>
            {COUNTRIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Save Button */}
      <button
        className={`profile-save-btn ${saveSuccess ? 'save-success' : ''}`}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}
      </button>

      {/* Secondary Actions */}
      <div className="profile-secondary-actions">
        <button className="profile-logout-btn" onClick={handleLogout}>
          Log Out
        </button>
        <button className="profile-delete-btn" onClick={() => setShowDeleteModal(true)}>
          Delete Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Account?</h3>
            <p>This action cannot be undone. All your data will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
                Cancel
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={handleDeleteAccount} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
