import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StockIn from './components/StockIn';
import Stockout from './components/Stockout';
import Services from './components/Services';
import Report from './components/Report';
import LoginPage from './components/LoginPage';
import UserManagement from './components/UserManagement';
import Clients from './components/Clients';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ wait before rendering routes

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  if (loading) return null; // Or show a loader/spinner

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage setUser={setUser} />} />

        <Route
          path="/app"
          element={user ? <Layout user={user} /> : <Navigate to="/" />}
        >
          {user?.role === 'admin' && (
            <>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="stockin" element={<StockIn />} />
              <Route path="stockout" element={<Stockout />} />
              <Route path="services" element={<Services />} />
              <Route path="report" element={<Report />} />
              <Route path="clients" element={<Clients />} />
              <Route path="user-management" element={<UserManagement />} />
            </>
          )}

          {user?.role === 'supervisor' && (
            <>
              <Route path="stockout" element={<Stockout />} />
              <Route path="report" element={<Report />} />
            </>
          )}

          {user?.role === 'user' && (
            <>
              <Route path="stockout" element={<Stockout />} />
              <Route path="services" element={<Services />} />
              <Route path="report" element={<Report />} />
            </>
          )}

          {/* Fallback inside /app */}
          <Route path="*" element={<Navigate to="/app/stockout" />} />
        </Route>

        {/* Fallback for non-matching routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
