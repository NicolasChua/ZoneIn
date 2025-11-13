/**
 * @description
 * This component displays a loading state to the user while their zoning report is being generated.
 * It shows a series of progress steps and a loading map view of the requested address.
 *
 * @dependencies
 * - react: For state management (`useState`, `useEffect`, `useRef`).
 * - lucide-react: For icons.
 *
 * @props
 * - address: The address being processed, used for display and for the map.
 *
 * @notes
 * - This component relies on the Google Maps JavaScript API and requires the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
 *   environment variable to be set.
 * - This must be a client component (`"use client"`) due to its use of React hooks.
 */
"use client"

import { useEffect, useState, useRef } from "react";
import { Loader2, MapPin, FileText, Database } from "lucide-react";

interface LoadingSectionProps {
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

const LoadingSection = ({ address }: LoadingSectionProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const steps = [
    { icon: MapPin, text: "Locating property..." },
    { icon: Database, text: "Fetching city records..." },
    { icon: FileText, text: "Generating report..." }
  ];

  // Animate through the loading steps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [steps.length]);

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
  }, [address]);

  /**
   * Initializes the Google Map, geocodes the address, and places a marker.
   */
  const initializeMap = () => {
    if (!mapRef.current) return;

    const googleWindow = window as GoogleMapsWindow;
    if (!googleWindow.google) return;

    const geocoder = new googleWindow.google.maps.Geocoder();

    geocoder.geocode({ address: `${address}, Chicago, IL` }, (results: any, status: string) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;

        const map = new googleWindow.google!.maps.Map(mapRef.current!, {
          center: location,
          zoom: 16,
          mapTypeId: 'hybrid',
          styles: [
            {
              featureType: "all",
              elementType: "labels",
              stylers: [{ visibility: "on" }]
            }
          ],
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        // Add a custom marker for the property location
        new googleWindow.google!.maps.Marker({
          position: location,
          map: map,
          title: address,
          animation: googleWindow.google!.maps.Animation.DROP,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="<http://www.w3.org/2000/svg>">
                <path d="M16 4C11.6 4 8 7.6 8 12C8 18 16 28 16 28C16 28 24 18 24 12C24 7.6 20.4 4 16 4ZM16 15C14.3 15 13 13.7 13 12C13 10.3 14.3 9 16 9C17.7 9 19 10.3 19 12C19 13.7 17.7 15 16 15Z" fill="#ef4444"/>
              </svg>
            `),
            scaledSize: new googleWindow.google!.maps.Size(32, 32),
            anchor: new googleWindow.google!.maps.Point(16, 32)
          }
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
    <div className="max-w-4xl mx-auto text-center">
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg mb-6">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Processing Your Request
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          We're gathering comprehensive property information for:
        </p>
        <p className="text-xl font-semibold text-foreground mt-2">
          {address}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-12">
        <div className="flex justify-center items-center space-x-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={index} className="flex flex-col items-center">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-500
                  ${isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'}
                `}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Google Maps Integration */}
      <div className="bg-card rounded-lg shadow-medium overflow-hidden">
        <div className="relative h-80">
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
                  Loading map for {address}...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Message */}
      <div className="mt-8 p-6 bg-card rounded-lg shadow-sm">
        <p className="text-muted-foreground">
          Please wait while we compile your comprehensive property report.
          This usually takes less than a minute.
        </p>
      </div>
    </div>
  );
};

export default LoadingSection;
