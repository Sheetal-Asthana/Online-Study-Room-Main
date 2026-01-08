import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import profileApi from '../services/profileApi';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import ProfileStats from '../components/profile/ProfileStats';
import ProfileBadges from '../components/profile/ProfileBadges';
import ProfileActivity from '../components/profile/ProfileActivity';
import ProfileRooms from '../components/profile/ProfileRooms';
import ProfileSettings from '../components/profile/ProfileSettings';
import '../styles/Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getMyProfile();
      setProfile(response.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  const handleGoBack = () => {
    navigate('/home');
  };

  const renderTabContent = () => {
    if (!profile) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <div className="tab-content overview">
            <div className="overview-grid">
              <div className="overview-column">
                <ProfileStats stats={profile.studyStats} />
                <ProfileActivity activities={profile.recentActivity} />
              </div>
              <div className="overview-column">
                <ProfileBadges badges={profile.badges} />
                {profile.skillTags && profile.skillTags.length > 0 && (
                  <div className="skills-section">
                    <h3>Skills & Interests</h3>
                    <div className="skills-tags">
                      {profile.skillTags.map((skill, index) => (
                        <span key={index} className="skill-tag">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      
      case 'activity':
        return (
          <div className="tab-content activity">
            <ProfileActivity activities={profile.recentActivity} />
          </div>
        );
      
      case 'groups':
        return (
          <div className="tab-content groups">
            <ProfileRooms joinedRooms={profile.joinedRooms} />
          </div>
        );
      
      case 'badges':
        return (
          <div className="tab-content badges">
            <ProfileBadges badges={profile.badges} />
          </div>
        );
      
      case 'settings':
        return (
          <div className="tab-content settings">
            <ProfileSettings 
              profile={profile} 
              onProfileUpdate={setProfile}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="profile-page loading">
        <div className="loading-spinner">📚</div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page error">
        <div className="error-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button onClick={fetchProfile} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', background: '#16162e', borderBottom: '1px solid rgba(108, 92, 231, 0.2)' }}>
          <button onClick={handleGoBack} className="back-button" title="Back to Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Home
          </button>
          <h2 style={{ margin: 0, color: '#e5e5e5', fontSize: '1.3rem' }}>My Profile</h2>
          <div style={{ width: '120px' }}></div>
        </div>

        <ProfileHeader 
          profile={profile}
          isOwnProfile={true}
          onEdit={handleEditProfile}
        />
        
        <ProfileTabs 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        <div className="profile-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Profile;