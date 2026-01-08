import React from 'react';

const ProfileActivity = ({ activities }) => {
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return time.toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "room_joined": return "🚪";
      case "room_created": return "✨";
      case "goal_completed": return "✅";
      case "streak_updated": return "🔥";
      default: return "📝";
    }
  };

  return (
    <div className="profile-activity">
      <h3>Recent Activity</h3>
      
      {(!activities || activities.length === 0) ? (
        <div className="no-activity">
          <p>No recent activity yet</p>
          <span>Join study rooms to see your activity here!</span>
        </div>
      ) : (
        <div className="activity-list">
          {activities.slice(0, 10).map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">
                {getActivityIcon(activity.type)}
              </div>
              <div className="activity-content">
                <p className="activity-description">
                  {activity.description}
                </p>
                <span className="activity-time">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileActivity;