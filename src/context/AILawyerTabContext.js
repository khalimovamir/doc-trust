/**
 * AI Lawyer - Tab visibility context
 * Lets AILawyerScreen tell the tab navigator when user is in chat (hide tab bar) vs Start Chat (show tab bar).
 * lastVisitedTabRef — ref, обновляется при фокусе на Home/History/Settings; читается при "назад" в чате.
 */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const AILawyerTabContext = createContext({
  isInChat: false,
  setInChat: () => {},
  previousTab: 'HomeTab',
  setPreviousTab: () => {},
  lastVisitedTabRef: { current: 'HomeTab' },
});

export function AILawyerTabProvider({ children }) {
  const [isInChat, setInChat] = useState(false);
  const [previousTab, setPreviousTabState] = useState('HomeTab');
  const lastVisitedTabRef = useRef('HomeTab');

  const setPreviousTab = useCallback((name) => {
    lastVisitedTabRef.current = name;
    setPreviousTabState(name);
  }, []);

  return (
    <AILawyerTabContext.Provider
      value={{
        isInChat,
        setInChat,
        previousTab,
        setPreviousTab,
        lastVisitedTabRef,
      }}
    >
      {children}
    </AILawyerTabContext.Provider>
  );
}

export function useAILawyerTab() {
  return useContext(AILawyerTabContext);
}
