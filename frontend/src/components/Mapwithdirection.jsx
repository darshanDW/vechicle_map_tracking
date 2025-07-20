// src/components/LeafletMapWithDirections.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const carIcon = new L.Icon({
  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/61/61168.png", // car icon
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapUpdater({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      map.fitBounds(coords);
    }
  }, [coords, map]);
  return null;
}
const loadGoogleMapsScript = (apiKey) => {
  if (!apiKey) {
    console.error("Google Maps API key is not provided.");
    return Promise.reject("API key missing");
  }
  console.log("Loading Google Maps script with key:", apiKey);
  return new Promise((resolve) => {
    if (window.google && window.google.maps) {
      console.log("Google Maps script already loaded");
  resolve();
  return;
}

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
    console.log("Google Maps script loaded");
  });
};

export default function Mapwithdirection() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pathCoords, setPathCoords] = useState([]);
  const [carPosition, setCarPosition] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const indexRef = useRef(0);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    loadGoogleMapsScript(import.meta.env.VITE_API_KEY).then(() => {});
  }, []);
  const handleRoute = () => {
    if (!window.google) {
      alert("Google Maps SDK not loaded yet.");
      return;
    }
  
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          const points = result.routes[0].overview_polyline;
          const decoded = decodePolyline(points);
          setPathCoords(decoded);
          setCarPosition(decoded[0]);
          indexRef.current = 0;
          setPaused(false);
        } else {
          alert("Directions request failed: " + status);
        }
      }
    );
  };

  const decodePolyline = (encoded) => {
    let points = [];
    let index = 0,
      lat = 0,
      lng = 0;

    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      points.push([lat / 1e5, lng / 1e5]);
    }

    return points;
  };

  // Animation effect: handles pause/resume and speed changes
  useEffect(() => {
    // Always cancel previous animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (!pathCoords.length || paused) return;

    let lastTime = null;
    function animate(time) {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      if (delta >= 1000 / speed) {
        lastTime = time;
        indexRef.current++;
        if (indexRef.current < pathCoords.length) {
          setCarPosition(pathCoords[indexRef.current]);
        } else {
          // End of route
          animationFrameRef.current = null;
          return;
        }
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [pathCoords, paused, speed]);

  const togglePause = () => {
    setPaused((prev) => !prev);
  };

  const resetAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    indexRef.current = 0;
    if (pathCoords.length) setCarPosition(pathCoords[0]);
    setPaused(true);
  };
  return (
    <div className="app-container" style={{ minHeight: "100vh" }}>
      <header className="app-header">
        <h1><i className="fas fa-route icon"></i> Vehicle Tracking Demo</h1>
        <p>Live vehicle movement using Google Directions API</p>
      </header>

      <main className="main-content">
        <section className="control-panel">
          <div className="controls-group">
            <input
              type="text"
              className="input"
              placeholder="Origin "
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
            <input
              type="text"
              className="input"
              placeholder="Destination "
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleRoute}><i className="fas fa-route icon"></i> Get Directions</button>
            <button className="btn btn-secondary" onClick={togglePause}>
              <i className={`fas ${paused ? "fa-play" : "fa-pause"} icon`}></i> {paused ? "Resume" : "Pause"}
            </button>
            <button className="btn btn-outline" onClick={resetAnimation}>
              <i className="fas fa-redo icon"></i> Reset
            </button>
          </div>
          <div className="speed-control">
            <label htmlFor="speedRange"><i className="fas fa-tachometer-alt icon"></i> Speed:</label>
            <input
              type="range"
              id="speedRange"
              min="0.5"
              max="5"
              step="0.5"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
            <span id="speedValue">{speed}x</span>
          </div>
        </section>

        <section className="map-container">
          <MapContainer
            center={[19.8776, 73.8417]}
            zoom={13}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {pathCoords.length > 0 && <Polyline positions={pathCoords} color="blue" />}
            {pathCoords.length > 0 && <MapUpdater coords={pathCoords} />}
            {pathCoords.length > 0 && (
              <>
                <Marker position={pathCoords[0]} icon={defaultIcon} />
                <Marker
                  position={pathCoords[pathCoords.length - 1]}
                  icon={defaultIcon}
                />
              </>
            )}
            {carPosition && <Marker position={carPosition} icon={carIcon} />}
          </MapContainer>
        </section>

        <aside className="info-panel">
          <div className="info-card">
            <h3><i className="fas fa-car icon"></i> Vehicle Metadata</h3>
            <div className="info-content">
              {pathCoords.length > 0 && <p><strong>Current Coordinate:</strong> <span>{carPosition[0].toFixed(5)}, {carPosition[1].toFixed(5)}</span></p>}
              <p><strong>Speed:</strong> <span>{speed}x</span></p>
              <p><strong>Status:</strong> <span>{paused ? "Paused" : "Running"}</span></p>
            </div>
          </div>
        </aside>
      </main>

    </div>
  );
}
