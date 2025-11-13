/**
 * @description
 * This component renders the main address input form for the application. It serves as the
 * entry point for the user to start a zoning report query. It includes the header,
 * the input field with a submit button, and some feature highlights.
 *
 * @dependencies
 * - react: For state management (`useState`).
 * - @/components/ui/button: The application's standard Button component.
 * - @/components/ui/input: The application's standard Input component.
 * - lucide-react: For icons.
 *
 * @props
 * - onSubmit: An optional callback function that is triggered when a valid address is submitted.
 *
 * @notes
 * - This must be a client component (`"use client"`) because it uses React hooks for state.
 */
"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search } from "lucide-react";

interface AddressInputProps {
  onSubmit?: (address: string) => void;
}

const AddressInput = ({ onSubmit }: AddressInputProps) => {
  const [address, setAddress] = useState("");
  const [isValid, setIsValid] = useState(true);

  /**
   * A basic validation function to check if the address is a plausible Chicago address.
   * @param {string} addr - The address string to validate.
   * @returns {boolean} - True if the address seems valid, false otherwise.
   */
  const validateChicagoAddress = (addr: string): boolean => {
    // Basic validation - ensure it's not empty and contains some street info and a number.
    return addr.trim().length > 5 && /\\d/.test(addr);
  };

  /**
   * Handles the form submission event.
   * It validates the address and calls the `onSubmit` prop if it's valid.
   * @param {React.FormEvent} e - The form event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateChicagoAddress(address)) {
      setIsValid(false);
      return;
    }

    setIsValid(true);

    try {
      if (onSubmit) {
        onSubmit(address);
      }
    } catch (err) {
      console.error("Error during address submission:", err);
    }
  };

  /**
   * Handles changes to the input field, updating the component's state.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    if (!isValid) {
      setIsValid(true); // Reset validation state on new input
    }
  };

  return (
    <div className="max-w-4xl mx-auto text-center">
      {/* Header Section */}
      <div className="mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg mb-6">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          zone in
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Get comprehensive zoning codes, property details, and generate professional
          PDF reports for any Chicago address instantly.
        </p>
      </div>

      {/* Input Form Section */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Input
              type="text"
              value={address}
              onChange={handleInputChange}
              placeholder="Enter your Chicago address... (e.g., 123 N State St, Chicago, IL)"
              className={`text-lg h-16 pr-16 ${
                !isValid ? "border-destructive focus:ring-destructive" : ""
              }`}
              autoFocus
            />
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-muted-foreground" />
          </div>

          {!isValid && (
            <p className="text-destructive text-sm text-left">
              Please enter a valid Chicago address with street number and name.
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-14 text-lg"
            size="lg"
            disabled={!address.trim()}
          >
            {'Get Property Information'}
          </Button>
        </form>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mt-16 text-left">
          <div className="p-6 bg-card rounded-lg shadow-soft">
            <div className="w-10 h-10 bg-primary/10 rounded mb-4 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-card-foreground mb-2">
              Accurate Data
            </h3>
            <p className="text-muted-foreground text-sm">
              Direct integration with Chicago's Official City APIs for real-time property information.
            </p>
          </div>

          <div className="p-6 bg-card rounded-lg shadow-soft">
            <div className="w-10 h-10 bg-primary/10 rounded mb-4 flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-card-foreground mb-2">
              Comprehensive Reports
            </h3>
            <p className="text-muted-foreground text-sm">
              Turning complex zoning codes into fast, accurate, and accessible insights.
            </p>
          </div>

          <div className="p-6 bg-card rounded-lg shadow-soft">
            <div className="w-10 h-10 bg-primary/10 rounded mb-4 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-card-foreground mb-2">
              PDF Download
            </h3>
            <p className="text-muted-foreground text-sm">
              Professional PDF reports ready for sharing and documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressInput;
