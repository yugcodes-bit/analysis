// ALTERNATIVE EmotionDetector.jsx - USING CDN
import React, { useRef, useEffect, useState } from 'react';
import './EmotionDetector.css';

// We'll load face-api.js from CDN
let faceapiLoaded = false;

const EmotionDetector = ({ onEmotionDetected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [emotion, setEmotion] = useState('neutral');
  const [isActive, setIsActive] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    confidence: 0,
    expressions: {}
  });

  // Load FaceAPI from CDN
  useEffect(() => {
    const loadFaceAPI = async () => {
      if (faceapiLoaded) return;

      try {
        // Load face-api.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
        script.onload = async () => {
          console.log('✅ FaceAPI.js loaded from CDN');
          
          // Load models from our public folder
          const MODEL_URL = '/models';
          
          await Promise.all([
            window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
          ]);
          
          setModelsLoaded(true);
          faceapiLoaded = true;
          console.log('✅ FaceAPI models loaded successfully');
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('❌ Error loading FaceAPI:', error);
        setWebcamError('Failed to load emotion detection models');
      }
    };

    loadFaceAPI();
  }, []);

  // REAL EMOTION DETECTION
  const detectEmotions = async () => {
    if (!videoRef.current || !modelsLoaded || !window.faceapi) return;

    try {
      const detection = await window.faceapi
        .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detection) {
        const expressions = detection.expressions;
        const dominantEmotion = Object.keys(expressions).reduce((a, b) => 
          expressions[a] > expressions[b] ? a : b
        );
        
        const confidence = expressions[dominantEmotion];
        
        // Filter out low-confidence detections
        if (confidence > 0.6) {
          setEmotion(dominantEmotion);
          setDetectionStats({
            confidence: Math.round(confidence * 100),
            expressions: expressions
          });
          
          if (onEmotionDetected) {
            onEmotionDetected({
              emotion: dominantEmotion,
              confidence: confidence,
              timestamp: Date.now(),
              expressions: expressions
            });
          }
        }
        
        // Draw face detection box
        if (canvasRef.current) {
          const displaySize = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight
          };
          window.faceapi.matchDimensions(canvasRef.current, displaySize);
          
          const resizedDetection = window.faceapi.resizeResults(detection, displaySize);
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          window.faceapi.draw.drawDetections(canvasRef.current, resizedDetection);
          window.faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetection);
        }
      }
    } catch (error) {
      console.error('Error in emotion detection:', error);
    }
  };

  const startWebcam = async () => {
    try {
      if (!modelsLoaded) {
        setWebcamError('Emotion models still loading...');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
        setWebcamError(null);
        
        // Start REAL emotion detection loop
        const detectionInterval = setInterval(detectEmotions, 500);
        
        return () => clearInterval(detectionInterval);
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setWebcamError('Cannot access webcam. Please check permissions.');
    }
  };

  const stopDetection = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsActive(false);
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Format emotion for display
  const formatEmotion = (emotion) => {
    const emotionMap = {
      'happy': '😊 Happy',
      'sad': '😢 Sad', 
      'angry': '😠 Angry',
      'fearful': '😨 Fearful',
      'disgusted': '🤢 Disgusted',
      'surprised': '😲 Surprised',
      'neutral': '😐 Neutral'
    };
    return emotionMap[emotion] || emotion;
  };

  return (
    <div className="emotion-detector">
      <h3>🎭 Real Emotion Detection {modelsLoaded ? '✅' : '⏳'}</h3>
      
      <div className="detection-area">
        {webcamError ? (
          <div className="webcam-error">
            <div className="error-icon">⚠️</div>
            <p>{webcamError}</p>
            {!modelsLoaded && <p>Loading AI models...</p>}
          </div>
        ) : (
          <div className="webcam-feed">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="webcam-video"
            />
            <canvas 
              ref={canvasRef} 
              className="detection-canvas"
            />
          </div>
        )}
        
        <div className="emotion-display">
          <div className={`emotion-badge ${emotion}`}>
            {formatEmotion(emotion)}
            {detectionStats.confidence > 0 && (
              <span className="confidence"> ({detectionStats.confidence}% confidence)</span>
            )}
          </div>
          
          {detectionStats.confidence > 0 && (
            <div className="expression-breakdown">
              <small>Micro-expressions detected:</small>
              <div className="expression-bars">
                {Object.entries(detectionStats.expressions)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([expr, score]) => (
                    <div key={expr} className="expression-bar">
                      <span className="expr-name">{expr}:</span>
                      <div className="bar-container">
                        <div 
                          className="bar-fill" 
                          style={{width: `${score * 100}%`}}
                        ></div>
                      </div>
                      <span className="expr-score">{Math.round(score * 100)}%</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="controls">
        {!isActive ? (
          <button 
            onClick={startWebcam} 
            className="start-btn"
            disabled={!modelsLoaded}
          >
            {modelsLoaded ? '🎬 Start Real Emotion Detection' : '⏳ Loading AI Models...'}
          </button>
        ) : (
          <button onClick={stopDetection} className="stop-btn">
            ⏹️ Stop Detection
          </button>
        )}
      </div>

      <div className="emotion-log">
        <h4>Emotional Data Stream:</h4>
        <div className="data-stream">
          <div className="data-point">
            <span className="timestamp">Real-time</span>
            <span className="emotion-value">{formatEmotion(emotion)}</span>
            {detectionStats.confidence > 0 && (
              <span className="confidence-badge">{detectionStats.confidence}%</span>
            )}
          </div>
          <p>Building your emotional profile from real facial expressions...</p>
        </div>
      </div>
    </div>
  );
};

export default EmotionDetector;