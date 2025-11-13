/**
 * @description
 * This file defines the OpenAIProvider and a custom hook `useOpenAI`.
 * The provider manages the state for interacting with our backend's OpenAI endpoint.
 * It provides a `sendPrompt` function that takes an address, sends it to our API route,
 * and returns the AI-generated report.
 *
 * @dependencies
 * - react: For creating context and using hooks.
 * - @/app/prompt: Contains the base prompt, although it's used on the server now.
 *
 * @exports
 * - OpenAIProvider: The context provider component.
 * - useOpenAI: The custom hook to consume the context.
 */
"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

// The base prompt is now used on the server, but we keep the type for consistency.
type OpenAIRequest = {
  address: string;
};

// Define the shape of the context value.
type OpenAIContextValue = {
  loading: boolean;
  error: string | null;
  sendPrompt: (address: string) => Promise<any>;
};

// Create the context.
const OpenAIContext = createContext<OpenAIContextValue | undefined>(undefined);

/**
 * Provides the OpenAI API interaction context to its children.
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components to render.
 */
export const OpenAIProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sends an address to our backend API to generate a zoning report.
   * @param {string} address - The property address to generate a report for.
   * @returns {Promise<any>} A promise that resolves with the response from the OpenAI API.
   * @throws Will throw an error if the address is missing or the API call fails.
   */
  async function sendPrompt(address: string) {
    setLoading(true);
    setError(null);

    try {
      if (!address) {
        throw new Error('sendPrompt requires an address');
      }

      const payload: OpenAIRequest = { address };

      // The URL is now the Next.js API route we created in Step 5.
      const res = await fetch('/api/zoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'An error occurred while generating the report.');
      }

      setLoading(false);
      return data;
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      setLoading(false);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  const contextValue: OpenAIContextValue = {
    loading,
    error,
    sendPrompt,
  };

  return (
    <OpenAIContext.Provider value={contextValue}>
      {children}
    </OpenAIContext.Provider>
  );
};

/**
 * Custom hook to consume the OpenAIContext.
 * @returns The context value.
 * @throws Will throw an error if used outside of an OpenAIProvider.
 */
export function useOpenAI() {
  const ctx = useContext(OpenAIContext);
  if (!ctx) {
    throw new Error('useOpenAI must be used within an OpenAIProvider');
  }
  return ctx;
}
