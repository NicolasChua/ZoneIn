/**
 * @description
 * This is the main entry point page for the application. It orchestrates the user flow
 * for generating a zoning report, managing three states: 'input', 'loading', and 'results'.
 *
 * @dependencies
 * - react: For state management (`useState`).
 * - @/components/AddressInput: The initial form for address entry.
 * - @/components/LoadingSection: The UI shown while data is being fetched.
 * - @/components/ResultsSection: The UI for displaying the final report.
 * - @/providers/OpenAIProvider: The hook for interacting with our backend API.
 * - @/components/ui/sonner: The `toast` function for showing notifications.
 *
 * @notes
 * - This must be a client component (`"use client"`) as it manages UI state.
 * - The data fetching has been simplified to a single call to our own backend via `useOpenAI`.
 */
"use client";

import { useState } from "react";
import { toast } from "sonner";
import AddressInput from "@/components/AddressInput";
import LoadingSection from "@/components/LoadingSection";
import ResultsSection, { type PropertyData } from "@/components/ResultsSection";
import { useOpenAI } from "@/app/providers/OpenAIProvider";


// Define the possible states for the application's UI
export type AppState = "input" | "loading" | "results";

const Page = () => {
  const [currentState, setCurrentState] = useState<AppState>("input");
  const [address, setAddress] = useState("");
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const { sendPrompt, loading } = useOpenAI();

  /**
   * Handles the address submission from the AddressInput component.
   * It sets the state to 'loading', calls the backend to generate the report,
   * and then transitions to the 'results' state on success or back to 'input' on error.
   * @param {string} inputAddress - The address submitted by the user.
   */
  const handleAddressSubmit = async (inputAddress: string) => {
    setAddress(inputAddress);
    setCurrentState("loading");

    try {
      // Call the simplified sendPrompt function which hits our Next.js API route
      const response = await sendPrompt(inputAddress);

      // Extract the report content from the OpenAI response
      const content = response?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Failed to parse the report from the AI's response.");
      }
      setReportContent(content);

      // Set property data needed for the results section (e.g., for the map)
      setPropertyData({ address: inputAddress });
      setCurrentState("results");
      toast.success("Your report has been generated!");

    } catch (error) {
      console.error("Error in handleAddressSubmit:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error("Failed to generate report", {
        description: errorMessage,
      });
      setCurrentState("input");
    }
  };

  /**
   * Resets the application to its initial 'input' state.
   */
  const handleStartOver = () => {
    setCurrentState("input");
    setAddress("");
    setPropertyData(null);
    setReportContent(null);
  };

  /**
   * Renders the component corresponding to the current application state.
   * @returns {JSX.Element} The component for the current state.
   */
  const renderCurrentState = () => {
    switch (currentState) {
      case "input":
        return <AddressInput onSubmit={handleAddressSubmit} />;
      case "loading":
        return <LoadingSection address={address} />;
      case "results":
        if (propertyData && reportContent) {
          return (
            <ResultsSection
              propertyData={propertyData}
              reportContent={reportContent}
              onStartOver={handleStartOver}
            />
          );
        }
        // Fallback to input if data is missing
        handleStartOver();
        return <AddressInput onSubmit={handleAddressSubmit} />;
      default:
        return <AddressInput onSubmit={handleAddressSubmit} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="section-enter">
          {renderCurrentState()}
        </div>
      </div>
    </div>
  );
};

export default Page;
