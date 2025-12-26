import React, { useEffect, useState } from "react";
import "./DICOMViewer.css";

function DICOMViewer() {
  // Standalone DICOM viewer (rehabcare-frontend/Dicom)
  // Override in CRA via env var:
  //   REACT_APP_DICOM_VIEWER_URL=http://localhost:3001
  const viewerUrl = (process.env.REACT_APP_DICOM_VIEWER_URL || "http://localhost:3001").replace(/\/$/, "");
  const iframeSrc = `${viewerUrl}/`;

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  return (
    <section className={`doctor-dicom ${isFullscreen ? "doctor-dicom--fullscreen" : ""}`.trim()}>
      <header className="doctor-dicom__header">
        <h3 className="doctor-dicom__title">DICOM Viewer</h3>

        <div className="doctor-dicom__actions" role="group" aria-label="DICOM viewer actions">
          <button
            type="button"
            className="doctor-dicom__action"
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
        </div>
      </header>

      <div className="doctor-dicom__frame">
        <iframe
          title="DICOM Viewer"
          src={iframeSrc}
          className="doctor-dicom__iframe"
          allow="fullscreen"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals"
        />
      </div>
    </section>
  );
}

export default DICOMViewer;
