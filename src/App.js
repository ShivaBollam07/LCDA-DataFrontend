import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const App = () => {
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [categories] = useState([
    // List of categories
    'Chilli - Healthy',
    'Chilli - Leaf Curl Virus',
    'Pepper Bell - Bacterial Spot',
    'Pepper Bell - Healthy',
    'Potato - Early Blight',
    'Potato - Healthy',
    'Potato - Late Blight',
    'Tomato - Bacterial Spot',
    'Tomato - Early Blight',
    'Tomato - Healthy',
    'Tomato - Late Blight',
    'Tomato - Leaf Mold',
    'Tomato - Mosaic Virus',
    'Tomato - Septoria Leaf Spot',
    'Tomato - Target Spot',
    'Tomato - Two Spotted Spider Mite',
    'Tomato - Yellow Leaf Curl Virus'
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 4,
    totalPages: 1,
  });

  const fetchImages = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://lcda-databackend.onrender.com/uploads/paginated?page=${page}&limit=${pagination.limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch images');

      const data = await response.json();

      const formattedData = data.data
        .map((image) => {
          try {
            return {
              ...image,
              content: image.content && image.contentType
                ? `data:${image.contentType};base64,${btoa(
                  String.fromCharCode(...new Uint8Array(image.content.data))
                )}` : null,
            };
          } catch (transformError) {
            console.error('Image transform error:', transformError);
            return null;
          }
        })
        .filter((image) => image !== null);

      setImages(formattedData);
      setPagination({
        ...pagination,
        page: data.page,
        totalPages: data.totalPages,
      });

      setMessage('');
    } catch (err) {
      console.error('Fetch images error:', err);
      setMessage(`Failed to fetch images: ${err.message}`);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    fetchImages(pagination.page);
  }, [pagination.page, fetchImages]);

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
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
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
      const response = await fetch('https://lcda-databackend.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Image uploaded successfully!');
        setFile(null);
        setPreviewImage(null);
        setCategory('');
        fetchImages(pagination.page); // Refresh images
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

  const handlePageChange = (direction) => {
    setPagination((prev) => {
      const newPage = direction === 'next'
        ? Math.min(prev.page + 1, prev.totalPages)
        : Math.max(prev.page - 1, 1);
      fetchImages(newPage);
      return { ...prev, page: newPage };
    });
  };

  return (
    <div className="App">
      <h1>Plant Leaf Image Upload</h1>

      <form onSubmit={handleUpload} className="upload-container">
        <div className="input-buttons">
          <label className="file-input-label" style={{ width: '100px', maxWidth: '100px' }}>
            <i className="fas fa-file-upload" style={{ marginRight: '8px' }}></i>
            <span> File</span>
            <input type="file" className="file-input" accept="image/jpeg,image/png" onChange={handleFileChange} />
          </label>
          <button
            type="button"
            className="camera-button"
            onClick={activateCamera}
            style={{
              backgroundColor: '#007bff',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            <i className="fas fa-camera" style={{ marginRight: '8px' }}></i>
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
                onClick={capturePhoto}
                style={{
                  backgroundColor: '#28a745',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                Capture Photo
              </button>
              <button
                type="button"
                onClick={switchCamera}
                style={{
                  backgroundColor: '#ffc107',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                Switch Camera
              </button>
              <button
                type="button"
                onClick={deactivateCamera}
                style={{
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
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
          disabled={!file || !category || isLoading}
          style={{
            backgroundColor: '#007bff',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
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

      <div className="pagination-controls">
        <button
          onClick={() => handlePageChange('prev')}
          disabled={pagination.page <= 1}
          style={{
            backgroundColor: '#007bff',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Previous
        </button>
        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          onClick={() => handlePageChange('next')}
          disabled={pagination.page >= pagination.totalPages}
          style={{
            backgroundColor: '#007bff',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginLeft: '10px',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default App;
