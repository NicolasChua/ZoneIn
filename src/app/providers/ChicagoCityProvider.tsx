"use client";
import React, { createContext, useContext, useState } from 'react';
import { getZoningByAddress } from '../api/chicagoCity/chicagoCityApi.js';

type ChicagoContextValue = {
  loading: boolean;
  error: string | null;
  // Accept only an address string
  getZoneClass: (address: string) => Promise< { addressMatched: any; zoneClass: any } >;
};

const ChicagoContext = createContext<ChicagoContextValue | undefined>(undefined);

export const ChicagoCityProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getZoneClass(address: string) {
    setLoading(true);
    setError(null);
    try {
      if (!address || typeof address !== 'string') {
        throw new Error('Invalid address');
      }
  
      const res = await getZoningByAddress(address);

      setLoading(false);
      
      return res;
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || String(err));
      throw err;
    }
  }

  return (
    <ChicagoContext.Provider value={{ loading, error, getZoneClass }}>
      {children}
    </ChicagoContext.Provider>
  );
};

export function useChicagoCity() {
  const ctx = useContext(ChicagoContext);
  if (!ctx) throw new Error('useChicagoCity must be used within a ChicagoCityProvider');
  return ctx;
}
