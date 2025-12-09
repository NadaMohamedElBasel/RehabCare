// src/pages/doctor/Annotations.js
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Annotations.css";

function Annotations() {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/doctor/radiology-images");
      setImages(res.data);
    } catch (err) {
      console.error("Failed to fetch images", err);
    }
  };

  const fetchAnnotations = async (imgId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/doctor/annotations/${imgId}`);
      setAnnotations(res.data);
    } catch (err) {
      console.error("Failed to load annotations", err);
    }
  };

  const handleSelectImage = (img) => {
    setSelectedImage(img);
    fetchAnnotations(img.id);
  };

  return (
    <div className="annotations-container">
      <div className="annotation-header">
        <h2>Radiology Annotation Tool</h2>
      </div>

      <div className="image-viewer">
        {selectedImage ? (
          <img
            src={selectedImage.url}
            alt="scan"
            className="annotation-canvas"
            ref={canvasRef}
          />
        ) : (
          <p style={{ color: "white", textAlign: "center", marginTop: "250px" }}>
            Select an image to annotate
          </p>
        )}
      </div>

      <h3 style={{ marginTop: "25px" }}>Available Images</h3>
      <div className="annotation-list">
        {images.map((img) => (
          <div
            key={img.id}
            className="annotation-item"
            onClick={() => handleSelectImage(img)}
            style={{ cursor: "pointer" }}
          >
            {img.file_name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Annotations;
