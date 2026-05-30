import React, { useRef } from 'react';
import profileApi from '../../services/profileApi';

const ProfileHeader = ({ profile, isOwnProfile, onEdit, onProfileUpdate }) => {
  const fileInputRef = useRef(null);

  const formatStudyTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleProfilePicUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('profilePic', file);

      const response = await profileApi.uploadProfilePic(formData);
      
      // Update profile with new picture
      if (onProfileUpdate) {
        const updatedProfile = { ...profile, profilePhoto: response.data.profilePhoto };
        onProfileUpdate(updatedProfile);
      }

      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEditPhotoClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="profile-header">
      <div className="profile-photo-section">
        <div className="profile-photo">
          {profile.profilePhoto?.url ? (
            <img 
              src={`https://online-study-room-main.onrender.com${profile.profilePhoto.url}`} 
              alt={profile.username}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`profile-photo-placeholder ${profile.profilePhoto?.url ? 'hidden' : ''}`}>
            {profile.username?.charAt(0).toUpperCase()}
          </div>
        </div>
        {isOwnProfile && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleProfilePicUpload}
              accept="image/*"
              style={{ display: "none" }}
            />
            <button className="edit-photo-btn" onClick={handleEditPhotoClick}>
              Change Photo
            </button>
          </>
        )}
      </div>

      <div className="profile-info">
        <div className="name-section">
          <h1 className="profile-name">
            {profile.fullName || profile.username}
          </h1>
          {profile.pronouns && (
            <span className="pronouns">({profile.pronouns})</span>
          )}
          {isOwnProfile && (
            <button className="edit-profile-btn" onClick={onEdit}>
              Edit Profile
            </button>
          )}
        </div>

        <p className="username">@{profile.username}</p>
        
        {profile.bio && (
          <p className="bio">{profile.bio}</p>
        )}

        <div className="profile-details">
          {profile.location && (
            <div className="detail-item">
              <span className="detail-icon">📍</span>
              <span>{profile.location}</span>
            </div>
          )}
          {profile.school && (
            <div className="detail-item">
              <span className="detail-icon">🎓</span>
              <span>{profile.school}</span>
            </div>
          )}
          {profile.major && (
            <div className="detail-item">
              <span className="detail-icon">📚</span>
              <span>{profile.major}</span>
            </div>
          )}
        </div>

        {profile.studyGoals && (
          <div className="study-goals">
            <h4>Study Goals</h4>
            <p>{profile.studyGoals}</p>
          </div>
        )}
      </div>

      <div className="profile-stats-overview">
        <div className="stat-card">
          <div className="stat-value">
            {formatStudyTime(profile.studyStats?.totalStudyTime || 0)}
          </div>
          <div className="stat-label">Total Study Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {profile.studyStats?.currentStreak || 0} days
          </div>
          <div className="stat-label">Current Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {profile.studyStats?.roomsJoined || 0}
          </div>
          <div className="stat-label">Rooms Joined</div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
