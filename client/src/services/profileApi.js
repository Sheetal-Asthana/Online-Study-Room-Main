import API from "./api";

export const profileApi = {
  // Get current user's profile
  getMyProfile: () => API.get("/api/profile/me"),
  
  // Get profile by username
  getProfileByUsername: (username) => API.get(`/api/profile/${username}`),
  
  // Update profile
  updateProfile: (profileData) => API.put("/api/profile/me", profileData),
  
  // Upload profile picture
  uploadProfilePic: (formData) => API.post("/api/profile/upload-profile-pic", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }),
  
  // Add study time
  addStudyTime: (minutes, roomId, roomName) => 
    API.post("/study-time/track", { minutes, roomId, roomName }),
  
  // Add joined room
  addJoinedRoom: (roomId, roomName) => 
    API.post("/profile/joined-room", { roomId, roomName }),
  
  // Get study statistics
  getStudyStats: () => API.get("/api/study-time/stats")
};

export default profileApi;
