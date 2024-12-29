import React, { useState, useEffect, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const App = () => {
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
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
        setIsCropping(true);
        setCrop(undefined); // Reset crop when new file is selected
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const getCroppedImage = async (sourceImage, crop) => {
    const image = await createImage(sourceImage);
    const canvas = document.createElement('canvas');
    const pixelRatio = window.devicePixelRatio;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width * pixelRatio * scaleX;
    canvas.height = crop.height * pixelRatio * scaleY;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Canvas is empty');
            return;
          }
          blob.name = 'cropped.jpeg';
          resolve(blob);
        },
        'image/jpeg',
        1
      );
    });
  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });
  const handleCropComplete = (crop) => {
    setCompletedCrop(crop);
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(null);
  };

  const handleCropSave = async () => {
    if (!completedCrop || !previewImage) return;

    try {
      const croppedBlob = await getCroppedImage(previewImage, completedCrop);
      const croppedFile = new File([croppedBlob], 'cropped.jpeg', { type: 'image/jpeg' });
      setFile(croppedFile);
      setPreviewImage(URL.createObjectURL(croppedBlob));
      setIsCropping(false);
      setCrop(undefined);
      setCompletedCrop(null);
    } catch (e) {
      console.error('Error cropping image:', e);
      setMessage('Failed to crop image');
    }
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

  const activateCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      console.error('Camera activation error:', err);
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
        setIsCropping(true);
        setCrop(undefined);
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
              Capture Photo
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
              Close Camera
            </button>
          </div>
        )}

        {previewImage && isCropping ? (
          <div className="crop-container">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => handleCropComplete(c)}
              aspect={undefined}
              minWidth={50}
              minHeight={50}
            >
              <img
                src={previewImage}
                alt="Preview"
                style={{ maxWidth: '100%' }}
              />
            </ReactCrop>
            <div className="crop-buttons">
              <button
                type="button"
                style={{
                  backgroundColor: "#28a745",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  fontSize: "16px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  margin: "5px",
                  transition: "background-color 0.3s ease",
                  width: '100%',
                  maxWidth: '200px'
                }}
                onClick={handleCropSave}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#218838")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#28a745")}
              >
                Save Crop
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: "#dc3545",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  fontSize: "16px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  margin: "5px",
                  transition: "background-color 0.3s ease",
                  width: '100%',
                  maxWidth: '200px'
                }}
                onClick={handleCropCancel}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#c82333")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#dc3545")}
              >
                Cancel Crop
              </button>
            </div>
          </div>
        ) : previewImage && (
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
          disabled={!file || !category || isLoading || isCropping}
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