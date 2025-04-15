import React, { useState, useRef, useEffect } from 'react';
import { Filter, Save, Play, Pause, SkipForward, SkipBack, X } from 'lucide-react';

function App() {
  // State for video and frames
  const [videoSrc, setVideoSrc] = useState(null);
  const [frames, setFrames] = useState([]);
  const [selectedFrames, setSelectedFrames] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [frameRate, setFrameRate] = useState(1); // 1 frame per second by default
  const [activeFilter, setActiveFilter] = useState('none');

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setFrames([]);
      setSelectedFrames([]);
      setIsExtracting(false);
      setExtractionProgress(0);
      setCurrentTime(0);
    }
  };

  // Load video metadata
  useEffect(() => {
    if (videoRef.current && videoSrc) {
      videoRef.current.onloadedmetadata = () => {
        setDuration(videoRef.current.duration);
      };
    }
  }, [videoSrc]);

  // Update current time while playing
  useEffect(() => {
    let interval;
    if (isPlaying && videoRef.current) {
      interval = setInterval(() => {
        setCurrentTime(videoRef.current.currentTime);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Extract frame at current time
  const extractCurrentFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply filter if selected
    applyFilterToCanvas(ctx, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const newFrame = {
      id: Date.now(),
      src: dataUrl,
      time: video.currentTime,
      filter: activeFilter
    };

    setFrames(prev => [...prev, newFrame]);
  };

  // Apply filter to canvas
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
      case 'blur':
        // This is a simple blur - not as efficient as a real blur algorithm
        ctx.filter = 'blur(5px)';
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        return; // We already redrew the image with the filter
      case 'highcontrast':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] > 127 ? 255 : 0;
          data[i + 1] = data[i + 1] > 127 ? 255 : 0;
          data[i + 2] = data[i + 2] > 127 ? 255 : 0;
        }
        break;
      default:
        return; // No filter
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Extract frames at regular intervals
  const extractKeyframes = async () => {
    if (!videoRef.current) return;

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
  };

  // Handle play/pause
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

  // Seek forward/backward
  const seek = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Toggle frame selection
  const toggleFrameSelection = (frameId) => {
    setSelectedFrames(prev => 
      prev.includes(frameId) 
        ? prev.filter(id => id !== frameId) 
        : [...prev, frameId]
    );
  };

  // Download selected frames
  const downloadSelectedFrames = () => {
    const framesToDownload = selectedFrames.length > 0 
      ? frames.filter(frame => selectedFrames.includes(frame.id))
      : frames;

    framesToDownload.forEach((frame, index) => {
      const link = document.createElement('a');
      link.href = frame.src;
      link.download = `frame_${index}_${Math.floor(frame.time)}_sec_${frame.filter}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  // Format time display (MM:SS)
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Video-to-Image Frame Extractor & Editor</h1>
          <p className="text-gray-600 mt-2">Upload a video, extract frames, apply filters, and download selected frames</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex items-center justify-center space-x-4">
            <label className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600">
              <span>Upload Video</span>
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
            {videoSrc && (
              <div className="flex space-x-2">
                <button 
                  onClick={extractCurrentFrame} 
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
                  disabled={isExtracting}
                >
                  <Filter className="mr-2 h-5 w-5" />
                  <span>Capture Current Frame</span>
                </button>
                <button 
                  onClick={extractKeyframes} 
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center"
                  disabled={isExtracting}
                >
                  <SkipForward className="mr-2 h-5 w-5" />
                  <span>Extract All Keyframes</span>
                </button>
              </div>
            )}
          </div>

          {/* Extraction Progress */}
          {isExtracting && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${extractionProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">Extracting frames: {extractionProgress}%</p>
            </div>
          )}
        </div>

        {/* Video Player and Controls */}
        {videoSrc && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex flex-col lg:flex-row lg:space-x-6">
              <div className="lg:w-2/3 mb-4 lg:mb-0">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video 
                    ref={videoRef} 
                    src={videoSrc} 
                    className="w-full h-auto" 
                    onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
                
                {/* Video Controls */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={duration} 
                    value={currentTime} 
                    onChange={(e) => {
                      const newTime = parseFloat(e.target.value);
                      setCurrentTime(newTime);
                      if (videoRef.current) {
                        videoRef.current.currentTime = newTime;
                      }
                    }} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-center mt-4 space-x-4">
                    <button 
                      onClick={() => seek(-5)} 
                      className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"
                    >
                      <SkipBack className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={togglePlay} 
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                    <button 
                      onClick={() => seek(5)} 
                      className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"
                    >
                      <SkipForward className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Settings Panel */}
              <div className="lg:w-1/3 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-lg mb-4">Extraction Settings</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frame Rate (fps): {frameRate}
                  </label>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="10" 
                    step="0.1" 
                    value={frameRate} 
                    onChange={(e) => setFrameRate(parseFloat(e.target.value))} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Higher values extract more frames (may be slower)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apply Filter:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['none', 'grayscale', 'sepia', 'invert', 'blur', 'highcontrast'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-3 py-2 text-sm rounded-md capitalize ${
                          activeFilter === filter 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Hidden canvas for frame extraction */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Extracted Frames */}
        {frames.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Extracted Frames ({frames.length})</h2>
              <button 
                onClick={downloadSelectedFrames} 
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
              >
                <Save className="mr-2 h-5 w-5" />
                <span>{selectedFrames.length > 0 ? `Download Selected (${selectedFrames.length})` : 'Download All'}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {frames.map((frame) => (
                <div 
                  key={frame.id}
                  className={`relative rounded-lg overflow-hidden border-2 ${
                    selectedFrames.includes(frame.id) 
                      ? 'border-blue-500' 
                      : 'border-transparent'
                  }`}
                  onClick={() => toggleFrameSelection(frame.id)}
                >
                  <img 
                    src={frame.src} 
                    alt={`Frame at ${formatTime(frame.time)}`} 
                    className="w-full h-auto object-cover aspect-video"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 px-2 py-1 text-white text-xs">
                    <div className="flex justify-between">
                      <span>{formatTime(frame.time)}</span>
                      {frame.filter !== 'none' && (
                        <span className="capitalize">{frame.filter}</span>
                      )}
                    </div>
                  </div>
                  {selectedFrames.includes(frame.id) && (
                    <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;