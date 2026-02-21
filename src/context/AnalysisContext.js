/**
 * AI Lawyer - Analysis Result Context
 * Holds the last document analysis (from paste/upload/scan) for DetailsScreen
 */

import React, { createContext, useContext, useState } from 'react';

const AnalysisContext = createContext({
  analysis: null,
  setAnalysis: () => {},
  clearAnalysis: () => {},
});

export function AnalysisProvider({ children }) {
  const [analysis, setAnalysis] = useState(null);

  const clearAnalysis = () => setAnalysis(null);

  return (
    <AnalysisContext.Provider value={{ analysis, setAnalysis, clearAnalysis }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  return useContext(AnalysisContext);
}
