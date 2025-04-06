import React from 'react';
import { ThemeProvider } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { theme } from './theme/theme';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;