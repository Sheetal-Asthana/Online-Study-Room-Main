import React from 'react';

const ProfileBadges = ({ badges }) => {
  // Default badge definitions
  const defaultBadges = [
    {
      name: "Early Adopter",
      description: "Joined your first study room",
      icon: "🚀",
      earned: badges?.some(b => b.name === "Early Adopter")
    },
    {
      name: "Social Learner",
      description: "Joined 5+ different study rooms",
      icon: "👥",
      earned: badges?.some(b => b.name === "Social Learner")
    },
    {
      name: "Study Enthusiast",
      description: "Completed 10+ hours of study time",
      icon: "📚",
      earned: badges?.some(b => b.name === "Study Enthusiast")
    },
    {
      name: "Goal Crusher",
      description: "Completed 5+ study goals",
      icon: "🎯",
      earned: badges?.some(b => b.name === "Goal Crusher")
    },
    {
      name: "Night Owl",
      description: "Studied late at night",
      icon: "🦉",
      earned: badges?.some(b => b.name === "Night Owl")
    },
    {
      name: "Early Bird",
      description: "Studied early in the morning",
      icon: "🌅",
      earned: badges?.some(b => b.name === "Early Bird")
    }
  ];

  return (
    <div className="profile-badges">
      <h3>Achievements & Badges</h3>
      
      <div className="badges-grid">
        {defaultBadges.map((badge, index) => (
          <div 
            key={index}
            className={`badge-item ${badge.earned ? 'earned' : 'locked'}`}
            title={badge.description}
          >
            <div className="badge-icon">{badge.icon}</div>
            <div className="badge-info">
              <div className="badge-name">{badge.name}</div>
              <div className="badge-description">{badge.description}</div>
            </div>
            {!badge.earned && <div className="badge-lock">🔒</div>}
          </div>
        ))}
      </div>

      {/* Show earned badges count */}
      <div className="badges-summary">
        <p>
          Earned {badges?.filter(b => defaultBadges.some(db => db.name === b.name && db.earned)).length || 0} of {defaultBadges.length} badges
        </p>
      </div>
    </div>
  );
};

export default ProfileBadges;