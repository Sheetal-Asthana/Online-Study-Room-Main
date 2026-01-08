# Online Study Room 

The Online Study Room is a MERN stack web application designed for virtual collaborative learning. It enables real-time interaction through integrated video conferencing, chat, and a shared whiteboard. The platform includes productivity tools like a Pomodoro timer and focus sounds to enhance concentration. Users can track their study progress with detailed statistics and achievement badges. The system uses Socket.io for live synchronization and RESTful APIs for data management.

## Tech Stack

### **MERN Stack**
- **M**ongoDB - Database
- **E**xpress.js - Backend framework
- **R**eact - Frontend library
- **N**ode.js - Runtime environment

### **Additional Technologies**
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Vite** - Frontend build tool
- **CSS3** - Styling

## Complete Project Structure & Key Files

```
online-study-room/
├── public/
│   ├── sounds/
│   │    ├──focus sounds/
├── src/
│   ├── components/
│   │   ├── profile/
│   │   │   ├── ProfileActivity.jsx      # User activity feed
│   │   │   ├── ProfileBadges.jsx        # Achievement badges display
│   │   │   ├── ProfileHeader.jsx        # Profile header component
│   │   │   ├── ProfileRooms.jsx         # User's created/joined rooms
│   │   │   ├── ProfileSettings.jsx      # Profile settings form
│   │   │   ├── ProfileStats.jsx         # Study statistics
│   │   │   └── ProfileTabs.jsx          # Profile navigation tabs
│   │   ├── FileSharing.jsx              # File upload/download component
│   │   ├── FocusSounds.jsx              # Focus sound component 
│   │   ├── VideoConference.jsx          # Video call interface
│   │   └── Whiteboard.jsx               # Collaborative whiteboard
│   ├── pages/
│   │   ├── ChatRoom.jsx                 # Chat room interface
│   │   ├── CreateRoom.jsx               # Room creation form
│   │   ├── Dashboard.jsx                # User dashboard
│   │   ├── EditProfile.jsx              # Profile editing
│   │   ├── Home.jsx                     # Landing page
│   │   ├── JoinRoom.jsx                 # Room joining interface
│   │   ├── Login.jsx                    # Login page
│   │   ├── Profile.jsx                  # User profile page
│   │   ├── Register.jsx                 # Registration page
│   │   ├── Room.jsx                     # Room component
│   │   └── RoomPage.jsx                 # Main room page
│   ├── services/
│   │   ├── api.js                       # Main API calls
│   │   ├── profileApi.js                # Profile-specific APIs
│   │   └── socket.js                    # Socket.io configuration
│   └── styles/
│       ├── App.css
│       └── index.css
│
└── server/
    ├── models/
    │   ├── File.js                      # File schema
    │   ├── Message.js                   # Message schema
    │   ├── Room.js                      # Room schema
    │   ├── User.js                      # User schema
    │   └── UserProfile.js               # User profile schema
    ├── routes/
    │   ├── auth.js                      # Authentication routes
    │   ├── files.js                     # File handling routes
    │   ├── messages.js                  # Message routes
    │   ├── profile.js                   # Profile routes
    │   |── rooms.js                     # Room management routes
    |   └── studyTime.js                    
    ├── middleware/
    |   └── auth.js                      # Custom middleware
    |── server.js
    ├── uploads/                         #file uploads
    └── config/                          # Server configuration
```

## API Endpoints

### **Authentication Routes** (`/server/routes/auth.js`)
```javascript
POST  /api/auth/register     # User registration
POST  /api/auth/login        # User login
POST  /api/auth/logout       # User logout
GET   /api/auth/verify       # Verify token
POST  /api/auth/refresh      # Refresh token
```

### **User Profile Routes** (`/server/routes/profile.js`)
```javascript
GET    /api/profile                     # Get user profile
PUT    /api/profile                     # Update user profile
GET    /api/profile/stats               # Get user statistics
GET    /api/profile/activity            # Get user activity
PUT    /api/profile/settings            # Update user settings
GET    /api/profile/badges              # Get user badges
POST   /api/profile/badges              # Add user badge
GET    /api/profile/rooms               # Get user's rooms
```

### **Room Management Routes** (`/server/routes/rooms.js`)
```javascript
GET    /api/rooms                       # Get all rooms
POST   /api/rooms                       # Create new room
GET    /api/rooms/:id                   # Get room details
PUT    /api/rooms/:id                   # Update room
DELETE /api/rooms/:id                   # Delete room
POST   /api/rooms/:id/join              # Join room
POST   /api/rooms/:id/leave             # Leave room
GET    /api/rooms/:id/members           # Get room members
POST   /api/rooms/:id/members           # Add room member
DELETE /api/rooms/:id/members/:userId   # Remove room member
```

### **Message Routes** (`/server/routes/messages.js`)
```javascript
GET    /api/rooms/:roomId/messages      # Get room messages
POST   /api/rooms/:roomId/messages      # Send message
DELETE /api/messages/:messageId         # Delete message
PUT    /api/messages/:messageId         # Edit message
```

### **File Handling Routes** (`/server/routes/files.js`)
```javascript
POST   /api/files/upload                # Upload file
GET    /api/files/:fileId               # Download file
DELETE /api/files/:fileId               # Delete file
GET    /api/rooms/:roomId/files         # Get room files
```

### **Real-time Socket Events** (`/src/JS/socket.js`, `/server/socket/`)
```javascript
// Connection events
socket.on('connect')
socket.on('disconnect')

// Room events
socket.emit('join-room', roomId)
socket.on('user-joined', userData)
socket.on('user-left', userData)

// Video conferencing events
socket.emit('offer', data)
socket.emit('answer', data)
socket.emit('ice-candidate', data)

// Chat events
socket.emit('send-message', messageData)
socket.on('receive-message', messageData)

// Whiteboard events
socket.emit('draw', drawData)
socket.on('drawing', drawData)

// Pomodoro timer events
socket.emit('start-timer', timerData)
socket.on('timer-update', timerData)
socket.on('timer-complete', notification)
```

## Key Features & Corresponding Files

### **Video Conferencing**
- `src/components/VideoConference.jsx` - Video interface
- `src/pages/RoomPage.jsx` - Main room integration
- Socket events for real-time communication

### **Chat System**
- `src/pages/ChatRoom.jsx` - Chat interface
- `server/models/Message.js` - Message schema
- `server/routes/messages.js` - Message API routes

### **Pomodoro Timer & Focus Sounds**
- Integrated in room components
- Real-time synchronization via sockets
- User progress tracking in profile stats

### **User Progress Tracking**
- `src/components/profile/ProfileStats.jsx` - Statistics display
- `src/components/profile/ProfileActivity.jsx` - Activity feed
- `server/models/UserProfile.js` - Progress data schema

### **File Sharing**
- `src/components/FileSharing.jsx` - File interface
- `server/models/File.js` - File schema
- `server/routes/files.js` - File handling API

### **Whiteboard Collaboration**
- `src/components/Whiteboard.jsx` - Drawing interface
- Real-time synchronization via socket events

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Environment Variables
Create `.env` file in `/server` directory:
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/studyroom
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
CLIENT_URL=http://localhost:5173
```

### Development Scripts
```json
{
  "dev": "vite",
  "build": "vite build",
  "server": "nodemon server/server.js",
  "client": "vite",
  "dev:full": "concurrently \"npm run server\" \"npm run client\""
}
```


## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd online-study-room
   ```

2. **Install dependencies**
   ```bash
   # Install client dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   cd ..
   ```

3. **Environment Setup**
   Create a `.env` file in the server directory:
   ```env
   PORT=8000
   MONGODB_URI=mongodb://localhost:27017/studyroom
   JWT_SECRET=your_jwt_secret
   ```

4. **Start the application**
   ```bash
   # Start the client (from root directory)
   npm run dev
   
   # Start the server (from server directory in new terminal)
   cd server
   node server.js
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Registration & Login**: Create an account or login to access the platform
2. **Create/Join Rooms**: Start your own study room or join existing ones
3. **Collaborate**: Use video conferencing, chat, and whiteboard features
4. **Track Progress**: Monitor your study sessions and productivity metrics
5. **Customize Profile**: Add badges and update your settings

