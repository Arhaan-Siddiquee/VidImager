// ImageToVideoConverter.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { ArrowUpCircle, Film, Clock, Download, X, Settings, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import Lottie from 'lottie-react';
import animationData from './animation.json'; // This would be the path to your animation file

// Initialize FFmpeg
const ffmpeg = createFFmpeg({
  log: true,
  corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js',
});

const ImageToVideoConverter = () => {
  const [isFFmpegReady, setIsFFmpegReady] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [duration, setDuration] = useState(5);
  const [processing, setProcessing] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [conversionComplete, setConversionComplete] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const dropAreaRef = useRef(null);
  const inputFileRef = useRef(null);
  const videoRef = useRef(null);
  
  // Load FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        await ffmpeg.load();
        setIsFFmpegReady(true);
        console.log('FFmpeg loaded');
      } catch (error) {
        console.error('Error loading FFmpeg:', error);
      }
    };
    
    loadFFmpeg();
    
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleFile = (file) => {
    if (file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Reset video if a new image is uploaded
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl('');
        setConversionComplete(false);
      }
    } else {
      alert('Please upload an image file');
    }
  };
  
  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview('');
    if (inputFileRef.current) {
      inputFileRef.current.value = '';
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl('');
      setConversionComplete(false);
    }
  };
  
  const convertToVideo = async () => {
    if (!isFFmpegReady || !image) return;
    
    try {
      setProcessing(true);
      
      // Write the file to memory
      ffmpeg.FS('writeFile', 'input.jpg', await fetchFile(image));
      
      // Run ffmpeg command to convert image to video
      await ffmpeg.run(
        '-loop', '1',
        '-i', 'input.jpg',
        '-c:v', 'libx264',
        '-t', duration.toString(),
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        'output.mp4'
      );
      
      // Read the result
      const data = ffmpeg.FS('readFile', 'output.mp4');
      
      // Create a URL
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      setVideoUrl(url);
      setProcessing(false);
      setConversionComplete(true);
      
      // Trigger confetti effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
    } catch (error) {
      console.error('Error during conversion:', error);
      setProcessing(false);
      alert('Error converting image to video');
    }
  };
  
  const handleDownload = () => {
    if (!videoUrl) return;
    
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'image-video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold text-indigo-800 mb-4">Image to Video Converter</h1>
          <p className="text-lg text-gray-600">Upload an image, set the duration, and convert it to a video!</p>
        </motion.div>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-10">
            {!isFFmpegReady ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-32 h-32">
                  <Lottie animationData={animationData} loop />
                </div>
                <p className="mt-4 text-gray-600">Loading video converter...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative"
                    onDragEnter={handleDrag}
                  >
                    <div 
                      ref={dropAreaRef}
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50'} ${image ? 'bg-gray-50' : ''}`}
                      onClick={() => inputFileRef.current?.click()}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {!image ? (
                        <>
                          <ArrowUpCircle className="w-12 h-12 text-indigo-500 mb-4" />
                          <p className="text-gray-600 text-center mb-2">Drag & drop your image here</p>
                          <p className="text-gray-400 text-sm">or click to browse</p>
                        </>
                      ) : (
                        <div className="relative w-full">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="rounded-lg max-h-64 mx-auto object-contain" 
                          />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage();
                            }}
                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                      <input
                        ref={inputFileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gray-50 p-6 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-indigo-700">
                        <Clock size={20} />
                        <span className="font-medium">Duration (seconds)</span>
                      </div>
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-gray-500 hover:text-indigo-600 transition-colors"
                      >
                        <Settings size={20} />
                      </button>
                    </div>
                    
                    <div className="mb-4">
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1s</span>
                        <span>{duration}s</span>
                        <span>60s</span>
                      </div>
                    </div>
                    
                    {showSettings && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white p-4 rounded-lg border border-gray-200 mb-4"
                      >
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Exact Duration (seconds)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="300"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </motion.div>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={convertToVideo}
                      disabled={!image || processing}
                      className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium ${
                        !image || processing
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                      } transition-all`}
                    >
                      {processing ? (
                        <>
                          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Film size={20} />
                          Convert to Video
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gray-50 rounded-xl p-6 flex flex-col"
                >
                  <div className="flex items-center gap-2 text-indigo-700 mb-4">
                    <Film size={20} />
                    <span className="font-medium">Video Output</span>
                  </div>
                  
                  <div className="flex-grow bg-black/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {videoUrl ? (
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        className="max-w-full max-h-64 rounded"
                        controls
                        autoPlay
                        loop
                      />
                    ) : (
                      <div className="text-center p-8">
                        <Film size={48} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">Your video will appear here</p>
                      </div>
                    )}
                  </div>
                  
                  {conversionComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6"
                    >
                      <div className="flex items-center gap-2 mb-4 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                        <Check size={20} />
                        <span>Conversion complete!</span>
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDownload}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium shadow-md transition-all"
                      >
                        <Download size={20} />
                        Download Video
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
            <p className="text-center text-gray-500 text-sm">
              Upload your image, set the duration, and convert it to a video in seconds!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageToVideoConverter;
