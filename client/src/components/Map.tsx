/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

function loadMapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (window.google?.maps) {
      resolve();
      return;
    }

    // Check if API key is available
    if (!API_KEY) {
      reject(new Error("Google Maps API key is not configured. Please set VITE_FRONTEND_FORGE_API_KEY environment variable."));
      return;
    }

    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    
    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error("Google Maps script loading timeout. Please check your network connection."));
    }, 30000); // 30 second timeout

    script.onload = () => {
      clearTimeout(timeout);
      // Verify that google.maps is actually available
      if (!window.google?.maps) {
        script.remove();
        reject(new Error("Google Maps script loaded but API is not available."));
        return;
      }
      script.remove(); // Clean up immediately
      resolve();
    };

    script.onerror = (error) => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error(`Failed to load Google Maps script. This may be due to network issues or an invalid API key.`));
    };

    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const init = usePersistFn(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await loadMapScript();
      
      if (!mapContainer.current) {
        throw new Error("Map container element not found");
      }

      if (!window.google?.maps) {
        throw new Error("Google Maps API is not available after script load");
      }

      try {
        map.current = new window.google.maps.Map(mapContainer.current, {
          zoom: initialZoom,
          center: initialCenter,
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: true,
          mapId: "DEMO_MAP_ID",
        });

        if (onMapReady) {
          try {
            onMapReady(map.current);
          } catch (callbackError) {
            console.error("Error in onMapReady callback:", callbackError);
            // Don't fail the entire map initialization if callback fails
          }
        }
      } catch (mapError) {
        throw new Error(
          `Failed to initialize map: ${mapError instanceof Error ? mapError.message : "Unknown error"}`
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Failed to load map";
      console.error("Map initialization error:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  if (error) {
    return (
      <div className={cn("w-full h-[500px] flex items-center justify-center bg-muted rounded-lg", className)}>
        <div className="text-center p-6 space-y-2">
          <p className="text-destructive font-medium">Failed to load map</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => init()}
            className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("w-full h-[500px] flex items-center justify-center bg-muted rounded-lg", className)}>
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}
