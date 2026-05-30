import React, { useState, useRef, useEffect } from 'react';

const FocusSounds = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSound, setSelectedSound] = useState(null);
  const [volume, setVolume] = useState(0.3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  // Use your local MP3 files
  const focusSounds = [
    {
      id: 'rain',
      name: 'Rain',
      description: 'Gentle rainfall',
      url: 'soft-rain-sfx.wav',
      icon: '🌧️'
    },
    {
      id: 'forest',
      name: 'Forest',
      description: 'Peaceful forest ambiance',
      url: '/sounds/focus%20sounds/forest.mp3',
      icon: '🌲'
    },
    {
      id: 'soft',
      name: 'Soft Ambience',
      description: 'Gentle background sounds',
      url: '/sounds/focus%20sounds/soft.mp3',
      icon: '🔇'
    },
    {
      id: 'chill',
      name: 'Chill Vibes',
      description: 'Relaxing atmosphere',
      url: '/sounds/focus%20sounds/chill.mp3',
      icon: '😌'
    }
  ];

  // Handle audio playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      // Loop the audio
      audio.currentTime = 0;
      audio.play().catch(console.error);
    };

    const handleError = (error) => {
      console.error('Audio error:', error);
      setIsPlaying(false);
      setSelectedSound(null);
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playSound = async (sound) => {
    // Stop current sound if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (selectedSound?.id === sound.id && isPlaying) {
      // Toggle off same sound
      setSelectedSound(null);
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Attempting to play:', sound.name, sound.url);
      setIsLoading(true);
      
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = sound.url;
      audioRef.current.volume = volume;
      audioRef.current.loop = true;

      // Wait for audio to be ready to play
      await new Promise((resolve, reject) => {
        const onCanPlay = () => {
          audioRef.current.removeEventListener('canplay', onCanPlay);
          audioRef.current.removeEventListener('error', onError);
          resolve();
        };

        const onError = (error) => {
          audioRef.current.removeEventListener('canplay', onCanPlay);
          audioRef.current.removeEventListener('error', onError);
          reject(error);
        };

        audioRef.current.addEventListener('canplay', onCanPlay);
        audioRef.current.addEventListener('error', onError);

        // Timeout fallback - if audio doesn't load in 3 seconds, try anyway
        setTimeout(() => {
          audioRef.current.removeEventListener('canplay', onCanPlay);
          audioRef.current.removeEventListener('error', onError);
          console.log('Audio loading timeout, attempting to play anyway...');
          resolve();
        }, 3000);
      });

      await audioRef.current.play();
      setSelectedSound(sound);
      setIsPlaying(true);
      setIsLoading(false);
      console.log('Successfully playing:', sound.name);

    } catch (error) {
      console.error('Error playing sound:', error);
      setIsLoading(false);
      
      // Show helpful error message
      let errorMessage = `Unable to play "${sound.name}". `;
      
      if (error.name === 'NotSupportedError') {
        errorMessage += 'The audio format may not be supported by your browser.';
      } else if (error.name === 'NetworkError') {
        errorMessage += 'The audio file may not exist at the specified path.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      errorMessage += `\n\nTrying to load from: ${sound.url}`;
      alert(errorMessage);
    }
  };

  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsLoading(false);
    console.log('Sound stopped');
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.focus-sounds-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="focus-sounds-container" style={{ position: 'relative' }}>
      {/* Sound Player Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        style={{
          backgroundColor: selectedSound ? '#6366f1' : '#6b7280',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          minWidth: '140px',
          justifyContent: 'center',
          opacity: isLoading ? 0.7 : 1
        }}
        title="Focus Sounds"
      >
        {isLoading ? (
          <div style={{ 
            width: '16px', 
            height: '16px', 
            border: '2px solid transparent',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        ) : (
          <span>{isPlaying ? '🔊' : '🔇'}</span>
        )}
        {isLoading ? 'Loading...' : 'Focus Sounds'}
        {isPlaying && !isLoading && (
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            animation: 'pulse 1.5s infinite'
          }}></div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          padding: '16px',
          width: '320px',
          zIndex: 1000
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Focus Sounds</h4>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ×
            </button>
          </div>

          {/* Volume Control */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              color: '#6b7280',
              marginBottom: '8px'
            }}>
              Volume: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                background: '#e5e7eb',
                outline: 'none'
              }}
            />
          </div>

          {/* Sound Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '16px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {focusSounds.map((sound) => (
              <button
                key={sound.id}
                onClick={() => playSound(sound)}
                disabled={isLoading}
                style={{
                  backgroundColor: selectedSound?.id === sound.id && isPlaying 
                    ? '#6366f1' 
                    : '#f8fafc',
                  color: selectedSound?.id === sound.id && isPlaying 
                    ? 'white' 
                    : '#374151',
                  border: `1px solid ${
                    selectedSound?.id === sound.id && isPlaying 
                      ? '#6366f1' 
                      : '#e5e7eb'
                  }`,
                  padding: '12px 8px',
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{sound.icon}</span>
                <div>
                  <div style={{ fontWeight: '500' }}>{sound.name}</div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    opacity: 0.7,
                    marginTop: '2px'
                  }}>
                    {sound.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Current Sound Info & Controls */}
          {selectedSound && (isPlaying || isLoading) && (
            <div style={{
              padding: '12px',
              backgroundColor: isLoading ? '#fff3cd' : '#f0f9ff',
              border: `1px solid ${isLoading ? '#ffeaa7' : '#bae6fd'}`,
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.9rem',
                fontWeight: '500',
                marginBottom: '8px',
                color: isLoading ? '#856404' : '#0369a1'
              }}>
                {isLoading ? '🔄 Loading...' : '🎵 Now Playing:'} {selectedSound.icon} {selectedSound.name}
              </div>
              <button
                onClick={stopSound}
                disabled={isLoading}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                Stop Sound
              </button>
            </div>
          )}

          {/* No Sound Selected */}
          {!selectedSound && !isLoading && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.9rem'
            }}>
              Select a sound to enhance your focus
            </div>
          )}

        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="none" />
      
      {/* Add CSS for animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default FocusSounds;
