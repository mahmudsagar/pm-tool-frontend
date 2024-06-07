import React from 'react';
import ReactDOM from 'react-dom/client';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';

// Routes
import Home from '@/routes/Home';
import Check from '@/routes/Check';

// Stylesheet
import "@fontsource/inter/index.css";
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="check" element={<Check />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
