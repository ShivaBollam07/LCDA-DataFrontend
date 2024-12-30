import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const App = () => {
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [categories] = useState([
    'good tomato leaf',
    'diseased tomato leaf',
    'good chilli leaf',
    'diseased chilli leaf',
    'good groundnut leaf',
    'diseased groundnut leaf',
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' is back camera, 'user' is front camera

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://lcvd-datacollectorbackend.onrender.com/uploads', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch images');

      const data = await response.json();

      const formattedData = data
        .map((image) => {
          try {
            return {
              ...image,
              content: image.content && image.contentType
                ? `data:${image.contentType};base64,${btoa(
                  String.fromCharCode(...new Uint8Array(image.content.data))
                )}`
                : null,
            };
          } catch (transformError) {
            console.error('Image transform error:', transformError);
            return null;
          }
        })
        .filter((image) => image !== null);

      setImages(formattedData);
      setMessage('');
    } catch (err) {
      console.error('Fetch images error:', err);
      setMessage(`Failed to fetch images: ${err.message}`);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const activateCamera = async () => {
    try {
      // Stop any existing stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      console.error('Camera activation error:', err);
      setMessage('Failed to access camera');
    }
  };

  const switchCamera = async () => {
    // Toggle between front and back cameras
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
    // Reactivate camera with new facing mode
    if (cameraActive) {
      await activateCamera();
    }
  };

  const capturePhoto = () => {
    if (!cameraStream) return;

    const video = document.querySelector('#camera-video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(file);
        setPreviewImage(URL.createObjectURL(file));
        deactivateCamera();
      }
    }, 'image/jpeg');
  };

  const deactivateCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !category) {
      setMessage('Please select an image and a category');
      return;
    }

    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', category);

    try {
      const response = await fetch('https://lcvd-datacollectorbackend.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Image uploaded successfully!');
        setFile(null);
        setPreviewImage(null);
        setCategory('');
        await fetchImages();
      } else {
        setMessage(result.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setMessage(`Upload failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Plant Leaf Image Upload</h1>

      <form onSubmit={handleUpload} className="upload-container">
        <div className="input-buttons">
          <label className="file-input-label" style={{ width: '100px', maxWidth: '100px' }}>
            <i className="fas fa-file-upload" style={{ marginRight: '8px' }}></i>
            <span>Choose File</span>
            <input type="file" className="file-input" accept="image/jpeg,image/png" onChange={handleFileChange} />
          </label>
          <button
            type="button"
            className="camera-button"
            style={{
              marginTop: '10px',
              marginBottom: '10px',
              marginLeft: '5px',
              backgroundColor: '#f59e0b',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.3s ease',
            }}
            onClick={activateCamera}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
          >
            <i className="fas fa-camera" style={{ marginRight: '8px', fontSize: '16px' }}></i>
            <span>Use Camera</span>
          </button>
        </div>

        {cameraActive && (
          <div className="camera-container">
            <video
              id="camera-video"
              autoPlay
              playsInline
              muted
              ref={(video) => video && cameraStream && (video.srcObject = cameraStream)}
            />
            <div className="camera-controls">
              <button
                type="button"
                style={{
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  fontSize: "16px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  margin: "5px",
                  transition: "background-color 0.3s ease",
                }}
                onClick={capturePhoto}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#0056b3")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#007bff")}
              >
                <i className="fas fa-camera" style={{ marginRight: '8px' }}></i>
                Capture Photo
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: "#6c757d",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  fontSize: "16px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  margin: "5px",
                  transition: "background-color 0.3s ease",
                }}
                onClick={switchCamera}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#5a6268")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#6c757d")}
              >
                <i className="fas fa-sync" style={{ marginRight: '8px' }}></i>
                Switch Camera
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: "#dc3545",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  fontSize: "16px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  margin: "5px",
                  transition: "background-color 0.3s ease",
                }}
                onClick={deactivateCamera}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#a71d2a")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#dc3545")}
              >
                <i className="fas fa-times" style={{ marginRight: '8px' }}></i>
                Close Camera
              </button>
            </div>
          </div>
        )}

        {previewImage && (
          <div className="preview-container">
            <img src={previewImage} alt="Preview" className="preview-image" />
          </div>
        )}

        <div className="category-select">
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Select Category</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="upload-button"
          disabled={!file || !category || isLoading}
          style={{ width: '100%', marginTop: '10px' }}
        >
          Upload Image
        </button>

        {message && <div className="status-message">{message}</div>}
      </form>

      <div className="image-gallery">
        {isLoading ? (
          <p className="loading-message">Loading images...</p>
        ) : images.length === 0 ? (
          <p className="no-images">No images uploaded yet</p>
        ) : (
          images.map((image, index) => (
            <div key={image._id || index} className="image-card">
              <img src={image.content} alt={image.filename} className="uploaded-image" />
              <div className="image-info">
                <p><strong>Filename:</strong> {image.filename}</p>
                <p><strong>Category:</strong> {image.category}</p>
                <p><strong>Uploaded On:</strong> {new Date(image.uploadDate).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default App;