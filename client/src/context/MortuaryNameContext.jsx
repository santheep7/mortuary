import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config.js';

const MortuaryNameContext = createContext();

export const useMortuaryName = () => {
  const context = useContext(MortuaryNameContext);
  if (!context) {
    throw new Error('useMortuaryName must be used within a MortuaryNameProvider');
  }
  return context;
};

export const MortuaryNameProvider = ({ children }) => {
  const [mortuaryName, setMortuaryName] = useState('MOSC Medical College Mortuary');
  const [mortuaryLogo, setMortuaryLogo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMortuarySettings();
  }, []);

  const fetchMortuarySettings = async () => {
    try {
      const [nameRes, logoRes] = await Promise.all([
        axios.get(`${API_BASE}/billing-settings/mortuary-name`),
        axios.get(`${API_BASE}/billing-settings/mortuary-logo`)
      ]);
      setMortuaryName(nameRes.data.mortuary_name || 'MOSC Medical College Mortuary');
      setMortuaryLogo(logoRes.data.mortuary_logo);
    } catch (error) {
      console.error('Error fetching mortuary settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMortuaryName = (newName) => {
    setMortuaryName(newName);
  };

  const updateMortuaryLogo = (newLogo) => {
    setMortuaryLogo(newLogo);
  };

  return (
    <MortuaryNameContext.Provider value={{ mortuaryName, mortuaryLogo, loading, updateMortuaryName, updateMortuaryLogo, fetchMortuarySettings }}>
      {children}
    </MortuaryNameContext.Provider>
  );
};
