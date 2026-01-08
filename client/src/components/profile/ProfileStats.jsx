import React from 'react';

const ProfileStats = ({ stats }) => {
  const formatStudyTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const calculateProductivity = () => {
    const totalDays = Math.max(1, stats.roomsJoined || 1);
    const avgTime = (stats.totalStudyTime || 0) / totalDays;
    return Math.min(100, Math.round((avgTime / 60) * 10));
  };

  return (
    <div className="profile-stats">
      <h3>Study Statistics</h3>
      
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-number">
              {formatStudyTime(stats.totalStudyTime || 0)}
            </div>
            <div className="stat-description">Total Study Time</div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-number">{stats.currentStreak || 0}</div>
            <div className="stat-description">Current Streak</div>
            {stats.longestStreak > stats.currentStreak && (
              <div className="stat-subtext">
                Best: {stats.longestStreak} days
              </div>
            )}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.goalsCompleted || 0}</div>
            <div className="stat-description">Goals Completed</div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{stats.roomsJoined || 0}</div>
            <div className="stat-description">Rooms Joined</div>
          </div>
        </div>
      </div>

      <div className="productivity-meter">
        <h4>Productivity Level</h4>
        <div className="meter-container">
          <div 
            className="meter-fill"
            style={{ width: `${calculateProductivity()}%` }}
          ></div>
        </div>
        <div className="meter-labels">
          <span>Beginner</span>
          <span>Expert</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileStats;