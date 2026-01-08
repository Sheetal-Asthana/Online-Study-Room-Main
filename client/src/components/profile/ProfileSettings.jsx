import React, { useState } from 'react';
import profileApi from '../../services/profileApi';

const ProfileSettings = ({ profile, onProfileUpdate }) => {
  const [settings, setSettings] = useState({
    themePreferences: profile.themePreferences || {},
    privacySettings: profile.privacySettings || {}
  });
  const [saving, setSaving] = useState(false);

  const handleSettingChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const response = await profileApi.updateProfile(settings);
      onProfileUpdate(response.data);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-settings">
      <h3>Profile Settings</h3>
      
      <div className="settings-sections">
        {/* Theme Preferences */}
        <div className="settings-section">
          <h4>Theme Preferences</h4>
          <div className="setting-group">
            <label>Dark Mode</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.themePreferences.darkMode || false}
                onChange={(e) => handleSettingChange('themePreferences', 'darkMode', e.target.checked)}
              />
              <span className="slider"></span>
            </div>
          </div>
          
          <div className="setting-group">
            <label>Primary Color</label>
            <div className="color-options">
              {['#4f46e5', '#7c3aed', '#10b981', '#3b82f6', '#f59e0b'].map(color => (
                <button
                  key={color}
                  className={`color-option ${settings.themePreferences.primaryColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleSettingChange('themePreferences', 'primaryColor', color)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="settings-section">
          <h4>Privacy Settings</h4>
          
          <div className="setting-group">
            <label>Profile Visibility</label>
            <select
              value={settings.privacySettings.profileVisibility || 'public'}
              onChange={(e) => handleSettingChange('privacySettings', 'profileVisibility', e.target.value)}
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
              <option value="private">Private</option>
            </select>
          </div>
          
          <div className="setting-group">
            <label>Show Activity</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.privacySettings.showActivity !== false}
                onChange={(e) => handleSettingChange('privacySettings', 'showActivity', e.target.checked)}
              />
              <span className="slider"></span>
            </div>
          </div>
          
          <div className="setting-group">
            <label>Show Study Statistics</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.privacySettings.showStudyStats !== false}
                onChange={(e) => handleSettingChange('privacySettings', 'showStudyStats', e.target.checked)}
              />
              <span className="slider"></span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button 
          onClick={handleSaveSettings}
          disabled={saving}
          className="save-settings-btn"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;