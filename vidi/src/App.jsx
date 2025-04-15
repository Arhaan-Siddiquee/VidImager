import React, { useState, useRef, useEffect } from 'react';
import { 
  Filter, Save, Play, Pause, SkipForward, SkipBack, 
  Upload, Camera, Layers, Download, Sliders, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import './App.css';

function App() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [frames, setFrames] = useState([]);
  const [selectedFrames, setSelectedFrames] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [frameRate, setFrameRate] = useState(1); 
  const [activeFilter, setActiveFilter] = useState('none');
  const [isDragging, setIsDragging] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target?.files?.[0] || e;
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setFrames([]);
      setSelectedFrames([]);
      setIsExtracting(false);
      setExtractionProgress(0);
      setCurrentTime(0);
      toast.success('Video uploaded successfully!');
    }
  };

  useEffect(() => {
    if (videoRef.current && videoSrc) {
      videoRef.current.onloadedmetadata = () => {
        setDuration(videoRef.current.duration);
      };
    }
  }, [videoSrc]);

  useEffect(() => {
    let interval;
    if (isPlaying && videoRef.current) {
      interval = setInterval(() => {
        setCurrentTime(videoRef.current.currentTime);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileChange(e.dataTransfer.files[0]);
      }
    };

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      if (dropZone) {
        dropZone.removeEventListener('dragover', handleDragOver);
        dropZone.removeEventListener('dragleave', handleDragLeave);
        dropZone.removeEventListener('drop', handleDrop);
      }
    };
  }, []);

  const extractCurrentFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    applyFilterToCanvas(ctx, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const newFrame = {
      id: Date.now(),
      src: dataUrl,
      time: video.currentTime,
      filter: activeFilter
    };

    setFrames(prev => [...prev, newFrame]);
    toast.info('Frame captured!', { autoClose: 1500 });
  };

  const applyFilterToCanvas = (ctx, width, height) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    switch (activeFilter) {
      case 'grayscale':
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        }
        break;
      case 'sepia':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
          data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
          data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
        break;
      case 'invert':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        break;
      case 'neon':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, data[i] * 0.5));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * 1.5));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * 0.5));
        }
        break;
      case 'blur':
        ctx.filter = 'blur(5px)';
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        return;
      case 'highcontrast':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] > 127 ? 255 : 0;
          data[i + 1] = data[i + 1] > 127 ? 255 : 0;
          data[i + 2] = data[i + 2] > 127 ? 255 : 0;
        }
        break;
      case 'matrix':
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg * 0.2;
          data[i + 1] = avg * 1.2;
          data[i + 2] = avg * 0.2;
        }
        break;
      default:
        return; 
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const extractKeyframes = async () => {
    if (!videoRef.current) return;

    toast.info('Starting extraction process...', { autoClose: 2000 });
    setIsExtracting(true);
    setFrames([]);
    setExtractionProgress(0);

    const video = videoRef.current;
    const totalFrames = Math.floor(video.duration * frameRate);
    const frameInterval = 1 / frameRate;

    for (let i = 0; i < totalFrames; i++) {
      video.currentTime = i * frameInterval;
      await new Promise(resolve => {
        video.onseeked = () => {
          extractCurrentFrame();
          setExtractionProgress(Math.floor((i / totalFrames) * 100));
          resolve();
        };
      });
    }

    setIsExtracting(false);
    setExtractionProgress(100);
    toast.success('All frames extracted successfully!');
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seek = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const toggleFrameSelection = (frameId) => {
    setSelectedFrames(prev => 
      prev.includes(frameId) 
        ? prev.filter(id => id !== frameId) 
        : [...prev, frameId]
    );
  };

  const downloadSelectedFrames = () => {
    const framesToDownload = selectedFrames.length > 0 
      ? frames.filter(frame => selectedFrames.includes(frame.id))
      : frames;

    if (framesToDownload.length === 0) {
      toast.error('No frames to download!');
      return;
    }

    framesToDownload.forEach((frame, index) => {
      const link = document.createElement('a');
      link.href = frame.src;
      link.download = `vidimager_frame_${index}_${Math.floor(frame.time)}_sec_${frame.filter}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    toast.success(`${framesToDownload.length} frame(s) downloaded!`);
  };

  const selectAllFrames = () => {
    if (selectedFrames.length === frames.length) {
      setSelectedFrames([]);
    } else {
      setSelectedFrames(frames.map(frame => frame.id));
    }
  };

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      <ToastContainer position="top-right" theme="dark" />
      <Tooltip id="tooltip" />
      
      {/* Header */}
      <motion.header 
        className="app-header"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="logo">
          <Zap className="icon-glow" size={28} />
          <h1>VidImager</h1>
        </div>
        <p className="tagline">Advanced Video Frame Extraction & Editing</p>
      </motion.header>

      {/* Main Content */}
      <div className="main-content">
        {/* Upload Area */}
        {!videoSrc && (
          <motion.div 
            ref={dropZoneRef}
            className={`upload-area ${isDragging ? 'dragging' : ''}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="upload-inner">
              <Upload className="upload-icon" size={64} />
              <h2>Drop your video here</h2>
              <p>or click to browse files</p>
              <motion.button 
                className="upload-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current.click()}
              >
                Select Video
              </motion.button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="video/*" 
                onChange={handleFileChange} 
                className="hidden-input" 
              />
            </div>
            <div className="upload-glow"></div>
          </motion.div>
        )}

        {/* Video Player and Controls */}
        {videoSrc && (
          <motion.div 
            className="video-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="video-player-container">
              <div className="video-player">
                <video 
                  ref={videoRef} 
                  src={videoSrc} 
                  className="video-element" 
                  onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div className="video-overlay">
                  <motion.div 
                    className="play-btn-large"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isPlaying ? 0 : 0.8 }}
                    whileHover={{ opacity: 1, scale: 1.1 }}
                    onClick={togglePlay}
                  >
                    <Play size={48} />
                  </motion.div>
                </div>
              </div>
              
              {/* Video Controls */}
              <div className="video-controls">
                <div className="time-display">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="progress-bar-container">
                  <input 
                    type="range" 
                    min="0" 
                    max={duration || 1} 
                    value={currentTime} 
                    onChange={(e) => {
                      const newTime = parseFloat(e.target.value);
                      setCurrentTime(newTime);
                      if (videoRef.current) {
                        videoRef.current.currentTime = newTime;
                      }
                    }} 
                    className="progress-bar"
                  />
                </div>
                <div className="control-buttons">
                  <motion.button 
                    className="control-btn"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => seek(-5)}
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Back 5s"
                  >
                    <SkipBack size={20} />
                  </motion.button>
                  <motion.button 
                    className="control-btn play-btn"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={togglePlay}
                    data-tooltip-id="tooltip"
                    data-tooltip-content={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </motion.button>
                  <motion.button 
                    className="control-btn"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => seek(5)}
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Forward 5s"
                  >
                    <SkipForward size={20} />
                  </motion.button>
                  <motion.button 
                    className="control-btn"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={extractCurrentFrame}
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Capture Frame"
                  >
                    <Camera size={20} />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Settings Panel Toggle */}
            <motion.button
              className="panel-toggle"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPanel(!showPanel)}
            >
              <Sliders size={20} />
              {showPanel ? 'Hide' : 'Show'} Settings
            </motion.button>

            {/* Settings Panel */}
            <AnimatePresence>
              {showPanel && (
                <motion.div 
                  className="settings-panel"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3>Extraction Settings</h3>
                  
                  <div className="setting-item">
                    <label>Frame Rate: {frameRate} fps</label>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="10" 
                      step="0.1" 
                      value={frameRate} 
                      onChange={(e) => setFrameRate(parseFloat(e.target.value))} 
                      className="slider"
                    />
                    <p className="setting-description">
                      Higher values extract more frames
                    </p>
                  </div>
                  
                  <div className="setting-item">
                    <label>Apply Filter:</label>
                    <div className="filter-grid">
                      {['none', 'grayscale', 'sepia', 'invert', 'neon', 'matrix', 'blur', 'highcontrast'].map(filter => (
                        <motion.button
                          key={filter}
                          onClick={() => setActiveFilter(filter)}
                          className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {filter}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="action-buttons">
                    <motion.button 
                      className="action-btn extract-btn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={extractKeyframes}
                      disabled={isExtracting}
                    >
                      <Layers className="btn-icon" size={16} />
                      Extract All Frames
                    </motion.button>
                    
                    <motion.button 
                      className="action-btn download-btn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={downloadSelectedFrames}
                      disabled={frames.length === 0}
                    >
                      <Download className="btn-icon" size={16} />
                      {selectedFrames.length > 0 
                        ? `Download (${selectedFrames.length})` 
                        : 'Download All'}
                    </motion.button>

                    <motion.button 
                      className="action-btn select-btn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={selectAllFrames}
                      disabled={frames.length === 0}
                    >
                      {selectedFrames.length === frames.length && frames.length > 0
                        ? 'Deselect All' 
                        : 'Select All'}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Extraction Progress */}
        <AnimatePresence>
          {isExtracting && (
            <motion.div 
              className="extraction-progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <h3>Extracting Frames</h3>
              <div className="progress-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${extractionProgress}%` }}
                ></div>
              </div>
              <p>{extractionProgress}% Complete</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extracted Frames */}
        <AnimatePresence>
          {frames.length > 0 && !isExtracting && (
            <motion.div 
              className="frames-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="frames-header">
                <h2>Extracted Frames <span className="frame-count">{frames.length}</span></h2>
                <div className="frames-actions">
                  <motion.button 
                    className="frame-action-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={selectAllFrames}
                  >
                    {selectedFrames.length === frames.length && frames.length > 0
                      ? 'Deselect All' 
                      : 'Select All'}
                  </motion.button>
                  <motion.button 
                    className="frame-action-btn download-all-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={downloadSelectedFrames}
                  >
                    <Save size={16} className="btn-icon" />
                    {selectedFrames.length > 0 
                      ? `Download Selected (${selectedFrames.length})` 
                      : 'Download All'}
                  </motion.button>
                </div>
              </div>
              
              <div className="frames-grid">
                {frames.map((frame, index) => (
                  <motion.div 
                    key={frame.id}
                    className={`frame-item ${selectedFrames.includes(frame.id) ? 'selected' : ''}`}
                    onClick={() => toggleFrameSelection(frame.id)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="frame-img-container">
                      <img 
                        src={frame.src} 
                        alt={`Frame at ${formatTime(frame.time)}`}
                        className="frame-img" 
                      />
                      {selectedFrames.includes(frame.id) && (
                        <div className="frame-selected-indicator"></div>
                      )}
                    </div>
                    <div className="frame-info">
                      <span className="frame-time">{formatTime(frame.time)}</span>
                      {frame.filter !== 'none' && (
                        <span className="frame-filter">{frame.filter}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden-canvas" />
    </div>
  );
}

export default App;