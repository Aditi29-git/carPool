import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './redux/store';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import VerifyOTP from './components/auth/VerifyOTP';
import Dashboard from './components/Dashboard';
import CreateRide from './components/rides/CreateRide';
import SearchRides from './components/rides/SearchRides';
import ManageRides from './components/rides/ManageRides';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import { ToastContainer } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { checkAuth } from './redux/slices/authSlice';
import 'react-toastify/dist/ReactToastify.css';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  return (
    <div className="App">
      <Navbar />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/create-ride"
          element={
            <PrivateRoute>
              <CreateRide />
            </PrivateRoute>
          }
        />
        <Route
          path="/search-rides"
          element={
            <PrivateRoute>
              <SearchRides />
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-rides"
          element={
            <PrivateRoute>
              <ManageRides />
            </PrivateRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App; 