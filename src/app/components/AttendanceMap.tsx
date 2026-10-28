"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCrosshair, FiMapPin } from "react-icons/fi";

const HOME = { latitude: -7.765996, longitude: 110.5930427 };
const RADIUS_METERS = 20;
const WIDTH = 640;
const HEIGHT = 320;
const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const EARTH_CIRCUMFERENCE = 40075016.686;

type Point = { latitude: number; longitude: number };

function project({ latitude, longitude }: Point, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function distanceMeters(a: Point, b: Point) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function AttendanceMap() {
  const [position, setPosition] = useState<Point | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsState, setGpsState] = useState<"loading" | "ready" | "denied" | "error" | "unsupported">("loading");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState("unsupported");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setAccuracy(coords.accuracy);
        setGpsState("ready");
      },
      (error) => setGpsState(error.code === error.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const map = useMemo(() => {
    const points = position ? [HOME, position] : [HOME];
    const initial = project(HOME, MAX_ZOOM);
    let zoom = MAX_ZOOM;
    let center = initial;
    if (position) {
      for (let candidate = MAX_ZOOM; candidate >= MIN_ZOOM; candidate -= 1) {
        const projected = points.map((point) => project(point, candidate));
        const xs = projected.map((point) => point.x);
        const ys = projected.map((point) => point.y);
        if (Math.max(...xs) - Math.min(...xs) <= WIDTH - 112 && Math.max(...ys) - Math.min(...ys) <= HEIGHT - 100) {
          zoom = candidate;
          center = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
          break;
        }
      }
    }
    const home = project(HOME, zoom);
    const current = position ? project(position, zoom) : null;
    const left = center.x - WIDTH / 2;
    const top = center.y - HEIGHT / 2;
    const firstX = Math.floor(left / TILE_SIZE);
    const firstY = Math.floor(top / TILE_SIZE);
    const lastX = Math.floor((left + WIDTH) / TILE_SIZE);
    const lastY = Math.floor((top + HEIGHT) / TILE_SIZE);
    const tileCount = 2 ** zoom;
    const tiles = [];
    for (let x = firstX; x <= lastX; x += 1) {
      for (let y = firstY; y <= lastY; y += 1) {
        if (y < 0 || y >= tileCount) continue;
        const wrappedX = ((x % tileCount) + tileCount) % tileCount;
        tiles.push({ key: `${zoom}-${wrappedX}-${y}`, x: x * TILE_SIZE - left, y: y * TILE_SIZE - top, url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png` });
      }
    }
    const pixelsPerMeter = (TILE_SIZE * 2 ** zoom) / EARTH_CIRCUMFERENCE / Math.cos((HOME.latitude * Math.PI) / 180);
    return {
      zoom,
      tiles,
      home: { x: home.x - left, y: home.y - top },
      current: current ? { x: current.x - left, y: current.y - top } : null,
      radius: RADIUS_METERS * pixelsPerMeter,
    };
  }, [position]);

  const distance = position ? distanceMeters(HOME, position) : null;
  const withinRange = distance !== null && distance <= RADIUS_METERS;
  const statusText = gpsState === "ready"
    ? `${withinRange ? "Di dalam" : "Di luar"} area presensi · ${distance?.toFixed(1)} m dari titik rumah`
    : gpsState === "loading"
      ? "Menghubungkan ke GPS perangkat…"
      : gpsState === "denied"
        ? "Izin lokasi belum diberikan. Aktifkan akses lokasi untuk melihat posisi Anda."
        : gpsState === "unsupported"
          ? "Browser ini tidak mendukung pembacaan GPS."
          : "Lokasi belum dapat dibaca. Pastikan GPS aktif dan coba lagi.";

  return (
    <section className="attendance-map-card" aria-label="Peta lokasi presensi">
      <div className="attendance-map-topline">
        <div><span className="attendance-map-kicker">LOKASI REAL TIME</span><strong>Rumah Gatak Krun</strong></div>
        <span className={`attendance-map-live ${gpsState === "ready" ? "is-live" : ""}`}><span />{gpsState === "ready" ? "GPS aktif" : "GPS"}</span>
      </div>
      <div className="attendance-map" role="img" aria-label={`Peta dengan lingkaran radius 20 meter. ${statusText}`}>
        {map.tiles.map((tile) => <img key={tile.key} className="attendance-map-tile" src={tile.url} alt="" draggable={false} style={{ left: `${(tile.x / WIDTH) * 100}%`, top: `${(tile.y / HEIGHT) * 100}%`, width: `${(TILE_SIZE / WIDTH) * 100}%`, height: `${(TILE_SIZE / HEIGHT) * 100}%` }} />)} {/* eslint-disable-line @next/next/no-img-element -- OSM raster tiles must be requested directly from the tile server. */}
        <svg className="attendance-map-overlay" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
          <circle cx={map.home.x} cy={map.home.y} r={Math.max(map.radius, 1)} className="attendance-map-radius" />
          <circle cx={map.home.x} cy={map.home.y} r="5" className="attendance-map-home-dot" />
          {map.current && <><circle cx={map.current.x} cy={map.current.y} r="16" className="attendance-map-user-halo" /><circle cx={map.current.x} cy={map.current.y} r="7" className="attendance-map-user-dot" /></>}
        </svg>
        <div className="attendance-map-home-label" style={{ left: `${(map.home.x / WIDTH) * 100}%`, top: `${(map.home.y / HEIGHT) * 100}%` }}><FiMapPin aria-hidden="true" /> Titik presensi</div>
        {map.current && <div className="attendance-map-user-label" style={{ left: `${(map.current.x / WIDTH) * 100}%`, top: `${(map.current.y / HEIGHT) * 100}%` }}><FiCrosshair aria-hidden="true" /> Anda</div>}
        <span className="attendance-map-scale">Radius 20 m</span>
        <a className="attendance-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </div>
      <div className={`attendance-map-status ${gpsState === "ready" ? (withinRange ? "is-inside" : "is-outside") : ""}`}>
        <span className="attendance-map-status-dot" />
        <p>{statusText}{accuracy !== null && gpsState === "ready" && <small>Akurasi GPS ±{Math.round(accuracy)} m</small>}</p>
      </div>
    </section>
  );
}
