import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProfileRooms = ({ joinedRooms }) => {
  const navigate = useNavigate();

  const handleRoomClick = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  const formatJoinDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="profile-rooms">
      <h3>Joined Study Rooms</h3>
      
      {(!joinedRooms || joinedRooms.length === 0) ? (
        <div className="no-rooms">
          <p>Haven't joined any rooms yet</p>
          <span>Create or join study rooms to collaborate with others!</span>
        </div>
      ) : (
        <div className="rooms-grid">
          {joinedRooms.map((room, index) => (
            <div 
              key={index}
              className="room-card"
              onClick={() => handleRoomClick(room.roomId)}
            >
              <div className="room-icon">📚</div>
              <div className="room-info">
                <h4 className="room-name">{room.roomName}</h4>
                <p className="room-id">ID: {room.roomId}</p>
                <span className="join-date">
                  Joined {formatJoinDate(room.joinedAt)}
                </span>
              </div>
              <div className="room-arrow">→</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileRooms;