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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMortuaryName();
  }, []);

  const fetchMortuaryName = async () => {
    try {
      const res = await axios.get(`${API_BASE}/billing-settings/mortuary-name`);
      setMortuaryName(res.data.mortuary_name || 'MOSC Medical College Mortuary');
    } catch (error) {
      console.error('Error fetching mortuary name:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMortuaryName = (newName) => {
    setMortuaryName(newName);
  };

  return (
    <MortuaryNameContext.Provider value={{ mortuaryName, loading, updateMortuaryName, fetchMortuaryName }}>
      {children}
    </MortuaryNameContext.Provider>
  );
};
