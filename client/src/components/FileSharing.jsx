import React, { useState, useEffect, useRef } from "react";
import API from "../services/api";
import socketService from "../services/socket";

const FileSharing = ({ roomCode, currentUser }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
    setupSocketListeners();
  }, [roomCode]);

  const fetchFiles = async () => {
    try {
      const response = await API.get(`/files/room/${roomCode}`);
      setFiles(response.data);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    const socket = socketService.getSocket();
    
    if (socket) {
      socket.on("new_file", (data) => {
        setFiles(prev => [data.file, ...prev]);
      });

      socket.on("file_removed", (data) => {
        setFiles(prev => prev.filter(file => file._id !== data.fileId));
      });
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("roomCode", roomCode);

      const response = await API.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Notify room about new file
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit("file_uploaded", {
          roomCode,
          file: response.data.file
        });
      }

      // Add to local state
      setFiles(prev => [response.data.file, ...prev]);

    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await API.get(`/files/download/${file._id}`, {
        responseType: "blob"
      });
      
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file");
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
      return;
    }

    try {
      await API.delete(`/files/${file._id}`);
      
      // Notify room about file deletion
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit("file_deleted", {
          roomCode,
          fileId: file._id
        });
      }

      // Remove from local state
      setFiles(prev => prev.filter(f => f._id !== file._id));
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("word") || fileType.includes("document")) return "📝";
    if (fileType.includes("spreadsheet") || fileType.includes("excel")) return "📊";
    if (fileType.includes("video")) return "🎬";
    if (fileType.includes("audio")) return "🎵";
    if (fileType.includes("zip") || fileType.includes("compressed")) return "📦";
    return "📎";
  };

  if (loading) {
    return (
      <div style={{ 
        padding: "20px", 
        textAlign: "center", 
        color: "#666" 
      }}>
        Loading files...
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: "white",
      border: "1px solid #e0e0e0",
      borderRadius: "8px",
      overflow: "hidden",
      height: "100%"
    }}>
      {/* Header */}
      <div style={{ 
        padding: "15px 20px",
        borderBottom: "1px solid #e0e0e0",
        backgroundColor: "#f8f9fa",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Shared Files</h3>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: "none" }}
            id="file-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: uploading ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
              opacity: uploading ? 0.6 : 1
            }}
          >
            {uploading ? "Uploading..." : "Upload File"}
          </button>
        </div>
      </div>

      {/* Files List */}
      <div style={{ 
        padding: "15px",
        overflowY: "auto",
        maxHeight: "400px"
      }}>
        {files.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: "#999",
            fontStyle: "italic",
            padding: "40px 20px"
          }}>
            No files shared yet
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file._id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px",
                border: "1px solid #f0f0f0",
                borderRadius: "6px",
                marginBottom: "10px",
                backgroundColor: "#fafafa",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f0f0f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#fafafa";
              }}
            >
              <div style={{ 
                fontSize: "1.5rem", 
                marginRight: "12px" 
              }}>
                {getFileIcon(file.fileType)}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: "500", 
                  marginBottom: "4px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {file.originalName}
                </div>
                <div style={{ 
                  fontSize: "0.8rem", 
                  color: "#666",
                  display: "flex",
                  gap: "12px"
                }}>
                  <span>{formatFileSize(file.fileSize)}</span>
                  <span>By {file.uploadedBy.username}</span>
                  <span>
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleDownload(file)}
                  style={{
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.8rem"
                  }}
                >
                  Download
                </button>
                
                {file.uploadedBy.userId === currentUser?.id && (
                  <button
                    onClick={() => handleDelete(file)}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem"
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FileSharing;