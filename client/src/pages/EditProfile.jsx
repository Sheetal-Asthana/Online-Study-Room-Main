import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import profileApi from '../services/profileApi';
import '../styles/Profile.css';

const EditProfile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    bio: '',
    pronouns: '',
    location: '',
    timezone: '',
    school: '',
    major: '',
    studyGoals: '',
    skillTags: []
  });
  const [skillsInput, setSkillsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getMyProfile();
      const profile = response.data;
      
      setFormData({
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        pronouns: profile.pronouns || '',
        location: profile.location || '',
        timezone: profile.timezone || '',
        school: profile.school || '',
        major: profile.major || '',
        studyGoals: profile.studyGoals || '',
        skillTags: profile.skillTags || []
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      alert('Failed to load profile');
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSkill = () => {
    const skill = skillsInput.trim();
    if (skill && !formData.skillTags.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skillTags: [...prev.skillTags, skill]
      }));
      setSkillsInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skillTags: prev.skillTags.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await profileApi.updateProfile(formData);
      navigate('/profile');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  if (loading) {
    return (
      <div className="edit-profile-page loading">
        <div className="loading-spinner">📚</div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-container">
        <div className="edit-profile-header">
          <button 
            className="back-button"
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
          <h1>Edit Profile</h1>
          <p>Update your personal information and preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="pronouns">Pronouns</label>
                <input
                  type="text"
                  id="pronouns"
                  name="pronouns"
                  value={formData.pronouns}
                  onChange={handleInputChange}
                  placeholder="e.g., they/them, he/him, she/her"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                rows="3"
                maxLength="500"
              />
              <div className="char-count">
                {formData.bio.length}/500
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Education & Location</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="school">School/University</label>
                <input
                  type="text"
                  id="school"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  placeholder="Your school or university"
                />
              </div>

              <div className="form-group">
                <label htmlFor="major">Major/Field</label>
                <input
                  type="text"
                  id="major"
                  name="major"
                  value={formData.major}
                  onChange={handleInputChange}
                  placeholder="Your major or field of study"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Your city or country"
                />
              </div>

              <div className="form-group">
                <label htmlFor="timezone">Timezone</label>
                <select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                >
                  <option value="">Select your timezone</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                  <option value="Europe/Paris">Central European Time (CET)</option>
                  <option value="Asia/Kolkata">India Standard Time (IST)</option>
                  <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                  <option value="Australia/Sydney">Australian Eastern Time (AET)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Study Information</h3>
            
            <div className="form-group">
              <label htmlFor="studyGoals">Study Goals</label>
              <textarea
                id="studyGoals"
                name="studyGoals"
                value={formData.studyGoals}
                onChange={handleInputChange}
                placeholder="What are your current study goals?"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="skills">Skills & Interests</label>
              <div className="skills-input-container">
                <input
                  type="text"
                  id="skills"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a skill or interest"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="add-skill-btn"
                >
                  Add
                </button>
              </div>
              
              {formData.skillTags.length > 0 && (
                <div className="skills-tags">
                  {formData.skillTags.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="remove-skill"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="save-btn"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;