"use client";
import React, { createContext, useContext, useState } from 'react';
import { DEFAULT_PROMPT } from "@/app/prompt"

type OpenAIRequest = {
  prompt?: string;
  address?: string | Record<string, any>;
  zoning?: string;
  basePrompt?: string;
};

type OpenAIContextValue = {
  loading: boolean;
  error: string | null;
  // sendPrompt now requires address and zoning
  sendPrompt: (address: string, zoning: string, basePrompt?: string) => Promise<any>;
};

const OpenAIContext = createContext<OpenAIContextValue | undefined>(undefined);

export const OpenAIProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendPrompt(address: string, zoning: string) {
    console.log('sendPrompt called with:', { address, zoning });
    setLoading(true);
    setError(null);
    try {
      if (!address || !zoning) {
        throw new Error('sendPrompt requires address and zoning');
      }

      const payload: OpenAIRequest = { address, zoning, basePrompt: DEFAULT_PROMPT };

      const res = await fetch('http://localhost:3000/api/openai-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('OpenAI response data:', data);
      setLoading(false);
      if (!res.ok) throw new Error(data?.error || 'OpenAI API error');
      return data;
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || String(err));
      throw err;
    }
  }

  return (
    <OpenAIContext.Provider value={{ loading, error, sendPrompt }}>
      {children}
    </OpenAIContext.Provider>
  );
};

export function useOpenAI() {
  const ctx = useContext(OpenAIContext);
  if (!ctx) throw new Error('useOpenAI must be used within an OpenAIProvider');
  return ctx;
}
