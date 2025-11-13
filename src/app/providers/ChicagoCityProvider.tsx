/**
 * @description
 * This file defines the ChicagoCityProvider and a custom hook `useChicagoCity`.
 * The provider creates a React context to manage state (loading, error) and expose
 * a function (`getZoneClass`) for fetching zoning information directly from the
 * City of Chicago's GIS APIs. This abstracts the data-fetching logic from the components.
 *
 * @dependencies
 * - react: For creating context and using hooks.
 * - @/lib/chicagoApi: The utility library for interacting with the Chicago GIS APIs.
 *
 * @exports
 * - ChicagoCityProvider: The context provider component.
 * - useChicagoCity: The custom hook to consume the context.
 */
"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { getZoningByAddress } from '@/lib/chicagoApi';

// Define the shape of the context value
type ChicagoContextValue = {
  loading: boolean;
  error: string | null;
  getZoneClass: (address: string) => Promise<{ addressMatched: string; zoneClass: string | null }>;
};

// Create the context
const ChicagoContext = createContext<ChicagoContextValue | undefined>(undefined);

/**
 * Provides the Chicago City API context to its children.
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components to render.
 */
export const ChicagoCityProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the zoning class for a given address.
   * @param {string} address - The address to look up.
   * @returns {Promise<{ addressMatched: string; zoneClass: string | null }>} A promise that resolves with the matched address and zoning class.
   * @throws Will throw an error if the address is invalid or the API call fails.
   */
  async function getZoneClass(address: string) {
    setLoading(true);
    setError(null);
    try {
      if (!address || typeof address !== 'string') {
        throw new Error('Invalid address provided.');
      }

      const res = await getZoningByAddress(address);
      setLoading(false);
      return res;
    } catch (err: any) {
      setLoading(false);
      const errorMessage = err?.message || String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  const contextValue: ChicagoContextValue = {
    loading,
    error,
    getZoneClass,
  };

  return (
    <ChicagoContext.Provider value={contextValue}>
      {children}
    </ChicagoContext.Provider>
  );
};

/**
 * Custom hook to consume the ChicagoCityContext.
 * @returns The context value.
 * @throws Will throw an error if used outside of a ChicagoCityProvider.
 */
export function useChicagoCity() {
  const ctx = useContext(ChicagoContext);
  if (!ctx) {
    throw new Error('useChicagoCity must be used within a ChicagoCityProvider');
  }
  return ctx;
}
