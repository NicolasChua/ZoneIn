/**
 * @description
 * This component displays the final results to the user, including the generated zoning report,
 * a map of the property, and action buttons to download a PDF or start over.
 *
 * @dependencies
 * - react: For state and lifecycle management (`useState`, `useEffect`, `useRef`).
 * - lucide-react: For icons.
 * - @/components/ui/button: The application's standard Button component.
 * - @/hooks/use-toast: Hook for displaying toast notifications.
 * - @/components/utility/markdown: Component for rendering Markdown content.
 *
 * @props
 * - propertyData: Object containing the address and other metadata.
 * - reportContent: The AI-generated report string in Markdown format.
 * - onStartOver: Callback function to reset the application state.
 *
 * @notes
 * - This component requires the Google Maps JavaScript API.
 * - The PDF download functionality has been simplified to link to a static file in the `/public` directory.
 */
"use client"

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Download, FileText, MapPin, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/utility/markdown";

export interface PropertyData {
  address: string;
  // This can be expanded with more structured data in the future
}

interface ResultsSectionProps {
  propertyData: PropertyData;
  reportContent: string;
  onStartOver: () => void;
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

/**
 * Sanitizes an address string to create a valid filename.
 * @param {string} address - The address to sanitize.
 * @returns {string} A sanitized string suitable for use as a filename.
 */
const sanitizeFilename = (address: string): string => {
  return address
    .replace(/[^\\w\\s-]/g, '') // Remove special characters
    .replace(/\\s+/g, '_')   // Replace spaces with underscores
    .trim()
    .toLowerCase();
};

const ResultsSection = ({ propertyData, reportContent, onStartOver }: ResultsSectionProps) => {
  const { toast } = useToast();
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  /**
   * Handles the PDF download action.
   * NOTE: This is a simplified version that links to a static file.
   * A future implementation could use a library like jsPDF to generate a PDF dynamically from `reportContent`.
   */
  const handleDownloadPDF = () => {
    try {
      const sanitizedAddress = sanitizeFilename(propertyData.address);
      const filename = `property_report_${sanitizedAddress}.pdf`;

      // Create a link to a static PDF in the /public folder
      const link = document.createElement('a');
      link.href = '/sample-report.pdf'; // Simplified: assumes a static file exists
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: `Sample report downloaded as ${filename}!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

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
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-lg mb-6">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Report Ready!
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          We've successfully compiled comprehensive property information for:
        </p>
        <p className="text-xl font-semibold text-foreground mt-2">
          {propertyData.address}
        </p>
      </div>

      {/* Google Maps and Report Section */}
      <div className="grid lg:grid-cols-2 gap-8 text-left">
        {/* Map */}
        <div className="bg-card rounded-lg shadow-md overflow-hidden">
          <div className="relative h-80 lg:h-full">
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
                    Loading Map...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-card rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-bold text-foreground mb-4">Zoning Report</h2>
          <div className="max-h-[600px] overflow-y-auto pr-2">
             <Markdown content={reportContent} />
          </div>
        </div>
      </div>


      {/* Action Buttons */}
      <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={handleDownloadPDF}
          size="lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Download PDF Report
        </Button>

        <Button
          onClick={onStartOver}
          variant="outline"
          size="lg"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Check Another Property
        </Button>
      </div>

      {/* Additional Info */}
      <div className="mt-12 p-6 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-center mb-3">
          <FileText className="w-5 h-5 text-muted-foreground mr-2" />
          <span className="text-sm font-medium text-muted-foreground">
            Report Details
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Disclaimer: This is a sample report. The full PDF report includes complete property details, zoning information, and more.
        </p>
      </div>
    </div>
  );
};

export default ResultsSection;
