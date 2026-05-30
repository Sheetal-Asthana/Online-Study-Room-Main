import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/JoinRoom.css";

function JoinRoom() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await API.post(
        "/api/rooms/join",
        { roomId, pin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(`Joined room: ${res.data.name}`);
      // Navigate to room page instead of chat page
      setTimeout(() => navigate(`/room/${res.data.roomId}`), 1000);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to join room");
    }
  };

  return (
    <div className="studyroom-container">
      <div className="studyroom-background">
        <div className="floating-element element-1"></div>
        <div className="floating-element element-2"></div>
        <div className="floating-element element-3"></div>
      </div>
      
      <div className="studyroom-card">
        <div className="card-header">
          <div className="study-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M14 17L10 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 3L8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 3L16 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2>Join Study Room</h2>
          <p className="card-subtitle">Enter your room details to start collaborating</p>
        </div>

        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form onSubmit={handleSubmit} className="studyroom-form">
            <div className="input-group">
              <div className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M20 20C20 18.3431 16.4183 17 12 17C7.58172 17 4 18.3431 4 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                className="modern-input"
              />
            </div>

            <div className="input-group">
              <div className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                type="password"
                placeholder="Room PIN (if private)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="modern-input"
              />
            </div>

            <button type="submit" className="modern-button">
              <span>Join Room</span>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>

        <div className="card-footer">
          <p>Need to create a room instead? <a href="/create-room" className="footer-link">Create Room</a></p>
        </div>
      </div>
    </div>
  );
}

export default JoinRoom;
