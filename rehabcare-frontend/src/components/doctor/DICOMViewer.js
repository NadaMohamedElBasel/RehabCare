import React, { useEffect, useState } from "react";
import "./DICOMViewer.css";

function DICOMViewer() {
  // Standalone DICOM viewer (rehabcare-frontend/Dicom)
  // Override in CRA via env var:
  //   REACT_APP_DICOM_VIEWER_URL=http://localhost:3001
  // Default behavior:
  // - Dev: expect the viewer to run on http://localhost:3001
  // - Prod: optionally serve a built viewer under /dicom-viewer/
  const defaultViewerUrl =
    process.env.NODE_ENV === "production" ? "/dicom-viewer" : "http://localhost:3001";

  const viewerUrl = (process.env.REACT_APP_DICOM_VIEWER_URL || defaultViewerUrl).replace(/\/$/, "");
  const iframeSrc = `${viewerUrl}/`;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerReachable, setViewerReachable] = useState(true);
  const [lastCheckAt, setLastCheckAt] = useState(null);

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

  // Lightweight availability check so we can show an actionable message when
  // the standalone viewer isn't running.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // `no-cors` lets this work even when the viewer serves without CORS headers.
        // If the server is down, fetch will still throw.
        await fetch(iframeSrc, { method: "GET", mode: "no-cors", cache: "no-store" });
        if (!cancelled) {
          setViewerReachable(true);
          setLastCheckAt(Date.now());
        }
      } catch {
        if (!cancelled) {
          setViewerReachable(false);
          setLastCheckAt(Date.now());
        }
      }
    };

    check();
    const id = window.setInterval(check, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [iframeSrc]);

  return (
    <section className={`doctor-dicom ${isFullscreen ? "doctor-dicom--fullscreen" : ""}`.trim()}>
      <header className="doctor-dicom__header">
        <h3 className="doctor-dicom__title">DICOM Viewer</h3>

        <div className="doctor-dicom__actions" role="group" aria-label="DICOM viewer actions">
          <a className="doctor-dicom__action" href={iframeSrc} target="_blank" rel="noreferrer">
            Open
          </a>
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

      {!viewerReachable && (
        <div className="doctor-dicom__notice" role="status">
          <div className="doctor-dicom__noticeTitle">Viewer is not reachable</div>
          <div className="doctor-dicom__noticeBody">
            The embedded viewer expects the Dicom app to be running at <strong>{viewerUrl}</strong>.
            <br />
            Start it from the frontend folder with: <code>npm run start:dicom</code>
            {process.env.NODE_ENV !== "production" && (
              <>
                <br />
                Or run both apps together with: <code>npm run start:all</code>
              </>
            )}
          </div>
          <div className="doctor-dicom__noticeMeta">
            Last check: {lastCheckAt ? new Date(lastCheckAt).toLocaleTimeString() : "-"}
          </div>
        </div>
      )}

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
