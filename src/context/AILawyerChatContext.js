/**
 * Doc Trust - Chat state context
 * Shared between AILawyerScreen and Details (and others) so "Ask AI" can open/create chat and navigate.
 */

import React, { createContext, useContext, useState } from 'react';

const AILawyerChatContext = createContext({
  hasChat: false,
  setHasChat: () => {},
  chatPrompt: '',
  setChatPrompt: () => {},
  chatContext: null,
  setChatContext: () => {},
  currentChatId: null,
  setCurrentChatId: () => {},
  refreshChatTrigger: 0,
  setRefreshChatTrigger: () => {},
  openChat: () => {},
  clearChat: () => {},
});

export function AILawyerChatProvider({ children }) {
  const [hasChat, setHasChat] = useState(false);
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatContext, setChatContext] = useState(null);
  const [currentChatIdState, setCurrentChatIdState] = useState(null);
  const [wasCleared, setWasCleared] = useState(false);
  const [refreshChatTrigger, setRefreshChatTrigger] = useState(0);

  const setCurrentChatId = (id) => {
    setCurrentChatIdState(id);
    if (id) setWasCleared(false);
  };

  const openChat = (prompt = '', context = null) => {
    setChatPrompt(prompt);
    setChatContext(context);
    setHasChat(true);
  };

  const clearChat = () => {
    setChatPrompt('');
    setChatContext(null);
    setCurrentChatIdState(null);
    setWasCleared(true);
    setHasChat(false);
  };

  return (
    <AILawyerChatContext.Provider
      value={{
        hasChat,
        setHasChat,
        chatPrompt,
        setChatPrompt,
        chatContext,
        setChatContext,
        currentChatId: currentChatIdState,
        setCurrentChatId,
        wasCleared,
        refreshChatTrigger,
        setRefreshChatTrigger,
        openChat,
        clearChat,
      }}
    >
      {children}
    </AILawyerChatContext.Provider>
  );
}

export function useAILawyerChat() {
  return useContext(AILawyerChatContext);
}
