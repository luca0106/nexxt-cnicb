import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchPluginManifest } from '../api/client';

const PluginContext = createContext(null);

export function PluginProvider({ children }) {
  const [isPluginConnected, setIsPluginConnected] = useState(() => {
    try {
      const saved = localStorage.getItem('bankdesk_external_plugin_connected');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [hostBankProfile, setHostBankProfile] = useState('BankDesk Core CRM (REST API)');
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [manifest, setManifest] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('bankdesk_external_plugin_connected', String(isPluginConnected));
    } catch {
      // ignore storage errors
    }
  }, [isPluginConnected]);

  useEffect(() => {
    fetchPluginManifest()
      .then((data) => setManifest(data))
      .catch(() => {});
  }, []);

  const togglePluginConnection = () => {
    setIsPluginConnected((prev) => !prev);
  };

  return (
    <PluginContext.Provider
      value={{
        isPluginConnected,
        setIsPluginConnected,
        togglePluginConnection,
        hostBankProfile,
        setHostBankProfile,
        isIntegrationModalOpen,
        setIsIntegrationModalOpen,
        manifest,
      }}
    >
      {children}
    </PluginContext.Provider>
  );
}

export function useExternalPlugin() {
  const ctx = useContext(PluginContext);
  if (!ctx) {
    return {
      isPluginConnected: true,
      setIsPluginConnected: () => {},
      togglePluginConnection: () => {},
      hostBankProfile: 'BankDesk Core CRM (REST API)',
      setHostBankProfile: () => {},
      isIntegrationModalOpen: false,
      setIsIntegrationModalOpen: () => {},
      manifest: null,
    };
  }
  return ctx;
}

