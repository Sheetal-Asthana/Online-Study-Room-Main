import React, { useEffect, useRef, useState, useCallback } from "react";

const Whiteboard = ({ roomId, socket, currentUser, isConnected }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const lastSentPointRef = useRef(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Redraw existing content
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // Socket event listeners for collaborative drawing
  useEffect(() => {
    if (!socket) return;

    console.log("🔌 Setting up whiteboard socket listeners");

    // Listen for drawing data from other users
    const handleWhiteboardDraw = (data) => {
      console.log("🎨 Received drawing data:", data);
      drawOnCanvas(data, false); // false = not from current user
    };

    // Listen for whiteboard clear
    const handleWhiteboardClear = () => {
      console.log("🧹 Received clear command");
      clearCanvas();
      setDrawingHistory([]);
      setHistoryIndex(-1);
    };

    // Listen for whiteboard undo/redo
    const handleWhiteboardUndo = (data) => {
      console.log("⎌ Received undo command");
      setHistoryIndex(data.historyIndex);
      redrawCanvas();
    };

    const handleWhiteboardRedo = (data) => {
      console.log("⎌ Received redo command");
      setHistoryIndex(data.historyIndex);
      redrawCanvas();
    };

    socket.on("whiteboard-draw", handleWhiteboardDraw);
    socket.on("whiteboard-clear", handleWhiteboardClear);
    socket.on("whiteboard-undo", handleWhiteboardUndo);
    socket.on("whiteboard-redo", handleWhiteboardRedo);

    return () => {
      console.log("🧹 Cleaning up whiteboard socket listeners");
      socket.off("whiteboard-draw", handleWhiteboardDraw);
      socket.off("whiteboard-clear", handleWhiteboardClear);
      socket.off("whiteboard-undo", handleWhiteboardUndo);
      socket.off("whiteboard-redo", handleWhiteboardRedo);
    };
  }, [socket]);

  const getCanvasCoordinates = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (!isConnected) {
      console.log("❌ Not connected, cannot draw");
      return;
    }
    
    const coordinates = getCanvasCoordinates(e.clientX, e.clientY);
    setIsDrawing(true);
    
    const drawingData = {
      type: "start",
      x: coordinates.x,
      y: coordinates.y,
      color,
      brushSize,
      userId: currentUser?.id,
      username: currentUser?.username,
      timestamp: Date.now()
    };

    console.log("🖊️ Starting draw:", drawingData);

    // Draw locally
    drawOnCanvas(drawingData, true);
    
    // Broadcast to other users
    if (socket) {
      socket.emit("whiteboard-draw", {
        roomCode: roomId,
        ...drawingData
      });
    }

    lastSentPointRef.current = coordinates;
  };

  const draw = (e) => {
    if (!isDrawing || !isConnected) return;

    const coordinates = getCanvasCoordinates(e.clientX, e.clientY);
    
    // Only send if we've moved enough distance (performance optimization)
    if (lastSentPointRef.current) {
      const dx = coordinates.x - lastSentPointRef.current.x;
      const dy = coordinates.y - lastSentPointRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 2) return; // Skip if movement is too small
    }

    const drawingData = {
      type: "draw",
      x: coordinates.x,
      y: coordinates.y,
      color,
      brushSize,
      userId: currentUser?.id,
      username: currentUser?.username,
      timestamp: Date.now()
    };

    console.log("🖊️ Drawing:", drawingData);

    // Draw locally
    drawOnCanvas(drawingData, true);
    
    // Broadcast to other users
    if (socket) {
      socket.emit("whiteboard-draw", {
        roomCode: roomId,
        ...drawingData
      });
    }

    lastSentPointRef.current = coordinates;
  };

  const stopDrawing = () => {
    console.log("🖊️ Stopping draw");
    setIsDrawing(false);
    lastSentPointRef.current = null;
    
    // Save to history when drawing stops
    if (drawingHistory.length > 0) {
      const newHistory = drawingHistory.slice(0, historyIndex + 1);
      setDrawingHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const drawOnCanvas = useCallback((data, isLocalUser = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext("2d");
    
    context.strokeStyle = data.color;
    context.lineWidth = data.brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";

    if (data.type === "start") {
      context.beginPath();
      context.moveTo(data.x, data.y);
      
      // Add to local history only if it's from the local user
      if (isLocalUser) {
        addToHistory(data);
      }
    } else if (data.type === "draw") {
      context.lineTo(data.x, data.y);
      context.stroke();
      
      // Add to local history only if it's from the local user
      if (isLocalUser) {
        addToHistory(data);
      }
    }

    console.log(`🎨 Drawn on canvas: ${data.type} at (${data.x}, ${data.y}) by ${data.username}`);
  }, []);

  const addToHistory = (data) => {
    setDrawingHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(data);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext("2d");
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw history up to current index
    const historyToDraw = drawingHistory.slice(0, historyIndex + 1);
    
    let currentPath = null;
    
    historyToDraw.forEach(data => {
      context.strokeStyle = data.color;
      context.lineWidth = data.brushSize;
      context.lineCap = "round";
      context.lineJoin = "round";

      if (data.type === "start") {
        context.beginPath();
        context.moveTo(data.x, data.y);
        currentPath = { x: data.x, y: data.y };
      } else if (data.type === "draw" && currentPath) {
        context.lineTo(data.x, data.y);
        context.stroke();
        currentPath = { x: data.x, y: data.y };
      }
    });
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    setDrawingHistory([]);
    setHistoryIndex(-1);

    console.log("🧹 Clearing whiteboard");

    // Broadcast clear to other users
    if (socket && isConnected) {
      socket.emit("whiteboard-clear", { roomCode: roomId });
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      redrawCanvas();

      console.log("⎌ Undoing");

      // Broadcast undo to other users
      if (socket && isConnected) {
        socket.emit("whiteboard-undo", { 
          roomCode: roomId, 
          historyIndex: newIndex 
        });
      }
    }
  };

  const redo = () => {
    if (historyIndex < drawingHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      redrawCanvas();

      console.log("⎌ Redoing");

      // Broadcast redo to other users
      if (socket && isConnected) {
        socket.emit("whiteboard-redo", { 
          roomCode: roomId, 
          historyIndex: newIndex 
        });
      }
    }
  };

  const exportWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL("image/png");
    
    const link = document.createElement("a");
    link.download = `whiteboard-${roomId}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  // Add debug info
  useEffect(() => {
    console.log("🔍 Whiteboard Debug Info:", {
      isConnected,
      roomId,
      currentUser: currentUser?.username,
      drawingHistoryLength: drawingHistory.length,
      historyIndex
    });
  }, [isConnected, roomId, currentUser, drawingHistory, historyIndex]);

  return (
    <div style={{ 
      backgroundColor: "white", 
      border: "1px solid #e0e0e0",
      borderRadius: "8px",
      padding: "20px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      display: "flex",
      flexDirection: "column",
      height: "100%"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "15px"
      }}>
        <h3 style={{ margin: 0 }}>Collaborative Whiteboard</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ 
            fontSize: "0.8rem", 
            color: isConnected ? "#4CAF50" : "#ff4444",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}>
            <div style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: isConnected ? "#4CAF50" : "#ff4444"
            }}></div>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          {/* Debug info */}
          <span style={{ 
            fontSize: "0.7rem", 
            color: "#666",
            backgroundColor: "#f0f0f0",
            padding: "2px 6px",
            borderRadius: "4px"
          }}>
            History: {drawingHistory.length}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ 
        display: "flex", 
        gap: "10px", 
        marginBottom: "15px",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        {/* Color Picker */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label style={{ fontSize: "0.8rem", color: "#666" }}>Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              width: "30px",
              height: "30px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          />
        </div>

        {/* Brush Size */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label style={{ fontSize: "0.8rem", color: "#666" }}>Size:</label>
          <select
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            style={{
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "0.8rem"
            }}
          >
            <option value={2}>Small</option>
            <option value={5}>Medium</option>
            <option value={10}>Large</option>
            <option value={15}>X-Large</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "5px", marginLeft: "auto" }}>
          <button
            onClick={undo}
            disabled={historyIndex <= 0 || !isConnected}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: historyIndex > 0 && isConnected ? "pointer" : "not-allowed",
              fontSize: "0.8rem",
              opacity: historyIndex > 0 && isConnected ? 1 : 0.5
            }}
            title="Undo"
          >
            ⎌ Undo
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= drawingHistory.length - 1 || !isConnected}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: historyIndex < drawingHistory.length - 1 && isConnected ? "pointer" : "not-allowed",
              fontSize: "0.8rem",
              opacity: historyIndex < drawingHistory.length - 1 && isConnected ? 1 : 0.5
            }}
            title="Redo"
          >
            ⎌ Redo
          </button>
          <button
            onClick={clearWhiteboard}
            disabled={!isConnected}
            style={{
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: isConnected ? "pointer" : "not-allowed",
              fontSize: "0.8rem",
              opacity: isConnected ? 1 : 0.5
            }}
            title="Clear Whiteboard"
          >
            🧹 Clear
          </button>
          <button
            onClick={exportWhiteboard}
            style={{
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.8rem"
            }}
            title="Export as PNG"
          >
            💾 Export
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ 
        flex: 1, 
        border: "2px dashed #e0e0e0",
        borderRadius: "4px",
        overflow: "hidden",
        backgroundColor: "#fafafa",
        position: "relative"
      }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault();
            startDrawing(e.touches[0]);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            draw(e.touches[0]);
          }}
          onTouchEnd={stopDrawing}
          style={{
            width: "100%",
            height: "100%",
            cursor: "crosshair",
            display: "block"
          }}
        />
        
        {!isConnected && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255,255,255,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#666",
            fontSize: "0.9rem"
          }}>
            ⚡ Connecting to whiteboard...
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{ 
        marginTop: "10px",
        fontSize: "0.7rem",
        color: "#999",
        textAlign: "center"
      }}>
        💡 Draw together in real-time! Changes sync with all room members.
        {isConnected && " ✅ Connected and syncing"}
      </div>
    </div>
  );
};

export default Whiteboard;