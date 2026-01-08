import React from 'react';

const ProfileTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '👤' },
    { id: 'activity', label: 'Activity', icon: '📊' },
    { id: 'groups', label: 'Study Rooms', icon: '👥' },
    { id: 'badges', label: 'Badges', icon: '🏆' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="profile-tabs">
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProfileTabs;