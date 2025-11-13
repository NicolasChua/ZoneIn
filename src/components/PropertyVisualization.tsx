/**
 * @description
 * This component is responsible for visualizing the property on a Google Map.
 * It takes property data, geocodes the address, and displays an interactive map with a marker.
 *
 * @dependencies
 * - react: For state and lifecycle management (`useState`, `useEffect`, `useRef`).
 * - lucide-react: For icons.
 *
 * @props
 * - propertyData: An object containing the address of the property to visualize.
 *
 * @notes
 * - This component requires the Google Maps JavaScript API and the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
 *   environment variable.
 * - This must be a client component (`"use client"`) due to its use of React hooks.
 */
"use client"

import React, { useEffect, useState, useRef } from "react";
import { MapPin } from "lucide-react";

// Define the shape of the property data prop
export interface PropertyData {
  address: string;
}

// Function to get the Google Maps API key from environment variables
const getGoogleMapsApiKey = (): string | null => {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
};

const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();

// Google Maps type definitions for window object
interface GoogleMapsWindow extends Window {
  google?: {
    maps: {
      Map: any;
      Marker: any;
      InfoWindow: any;
      Geocoder: any;
      Size: any;
      Point: any;
      Animation: {
        DROP: any;
      };
    };
  };
}

export const PropertyVisualization = ({ propertyData }: { propertyData: PropertyData }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Load and initialize the Google Map
  useEffect(() => {
    const googleWindow = window as GoogleMapsWindow;
    if (GOOGLE_MAPS_API_KEY && !googleWindow.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initializeMap();
      document.head.appendChild(script);
    } else if (googleWindow.google) {
      initializeMap();
    }
  }, [propertyData.address]);

  /**
   * Initializes the Google Map, geocodes the address, and places a marker.
   */
  const initializeMap = () => {
    if (!mapRef.current) return;

    const googleWindow = window as GoogleMapsWindow;
    if (!googleWindow.google) return;

    const geocoder = new googleWindow.google.maps.Geocoder();

    geocoder.geocode({ address: `${propertyData.address}, Chicago, IL` }, (results: any, status: string) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;

        const map = new googleWindow.google!.maps.Map(mapRef.current!, {
          center: location,
          zoom: 16,
          mapTypeId: 'hybrid',
          styles: [{ featureType: "all", elementType: "labels", stylers: [{ visibility: "on" }] }],
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        // Add a marker for the property location
        new googleWindow.google!.maps.Marker({
          position: location,
          map: map,
          title: propertyData.address,
          animation: googleWindow.google!.maps.Animation.DROP,
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
      } else {
        console.error('Geocoding failed:', status);
        setMapLoaded(false);
      }
    });
  };

  return (
    <div className="w-full h-96 bg-card rounded-lg shadow-md overflow-hidden relative">
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: '320px' }}
      />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-lg font-medium text-card-foreground mb-2">
              Property Location
            </p>
            <p className="text-muted-foreground">
              Loading map for {propertyData.address}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
