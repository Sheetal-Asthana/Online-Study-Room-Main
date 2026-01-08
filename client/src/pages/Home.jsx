import { useNavigate } from "react-router-dom";
import axios from "axios";
import React, { useState, useEffect } from "react"
import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [time, setTime] = useState(getCurrentTime());
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:9000/api/rooms/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRooms(res.data);
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      }
    };
    fetchRooms();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  function getCurrentTime() {
    return new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="home-container">
      {/* Background elements */}
      <div className="background-overlay"></div>
      <div className="grid-pattern"></div>

      <aside className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
        <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
          <span className="toggle-icon">{isOpen ? "←" : "→"}</span>
        </button>
        {isOpen && (
          <>
            <div className="sidebar-header">
              <h2 className="sidebar-title">Room</h2>
              <p className="sidebar-subtitle">Focus & Collaborate</p>
            </div>
            <nav className="sidebar-nav">
              <button className="nav-btn primary" onClick={() => navigate("/create-room")}>
                <span className="nav-icon">✨</span>
                <span className="nav-text">Create Room</span>
              </button>
              <button className="nav-btn" onClick={() => navigate("/join-room")}>
                <span className="nav-icon">🚀</span>
                <span className="nav-text">Join Room</span>
              </button>
              <button className="nav-btn" onClick={() => navigate("/profile")}>
                <span className="nav-icon">👤</span>
                <span className="nav-text">Profile</span>
              </button>
              <div className="nav-separator"></div>
              <button className="nav-btn logout" onClick={handleLogout}>
                <span className="nav-icon">🚪</span>
                <span className="nav-text">Logout</span>
              </button>
            </nav>
          </>
        )}
      </aside>

      <main className="main-content">
        <div className="hero-section">
          <div className="time-display">{time}</div>
          <div className="welcome-content">
            <h1 className="main-title">
              {getGreeting()}, {localStorage.getItem("username") || "Student"}!
            </h1>
            <p className="main-subtitle">Ready to unlock your potential?</p>
            <p className="motivational-quote">"The best time to focus is now."</p>
          </div>
        </div>

        <div className="quick-actions">
          <div className="action-card primary" onClick={() => navigate("/create-room")}>
            <div className="action-icon">🎯</div>
            <div className="action-content">
              <h3>Start Focusing</h3>
              <p>Create your study session</p>
            </div>
            <div className="action-arrow">→</div>
          </div>

          <div className="action-card" onClick={() => navigate("/join-room")}>
            <div className="action-icon">👥</div>
            <div className="action-content">
              <h3>Join Others</h3>
              <p>Collaborative study</p>
            </div>
            <div className="action-arrow">→</div>
          </div>
        </div>

        <div className="your-rooms">
          <h2>Your Rooms</h2>
          {rooms.length === 0 ? (
            <p>No rooms yet. Create or join one!</p>
          ) : (
            <ul>
              {rooms.map((room) => (
                <li key={room.roomId} onClick={() => navigate(`/room/${room.roomId}`)}>
                  {room.name} ({room.roomId})
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-header">
              <span className="feature-icon">⏰</span>
              <h3>Pomodoro Timer</h3>
            </div>
            <p>Stay focused with timed study sessions and strategic breaks</p>
            <div className="feature-stats">
              <span className="stat">25:00 sessions</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-header">
              <span className="feature-icon">🎧</span>
              <h3>Focus Sounds</h3>
            </div>
            <p>Ambient soundscapes to enhance concentration and productivity</p>
            <div className="feature-stats">
              <span className="stat">Lo-fi & Nature</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-header">
              <span className="feature-icon">📊</span>
              <h3>Progress Tracking</h3>
            </div>
            <p>Monitor your study habits and celebrate your achievements</p>
            <div className="feature-stats">
              <span className="stat">Weekly insights</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-header">
              <span className="feature-icon">🤝</span>
              <h3>Study Groups</h3>
            </div>
            <p>Connect with peers and maintain accountability together</p>
            <div className="feature-stats">
              <span className="stat">Join or create</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;