```javascript
import React from 'react';
import { MapProvider, useMap } from './context/MapContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext'; // Added import
import MapContainer from './components/MindMap/MapContainer';
import TimelineView from './components/Timeline/TimelineView';
import MenuBar from './components/Layout/MenuBar';
import IconToolbar from './components/Layout/IconToolbar';
import Login from './components/Auth/Login';
import './App.css';

const AppContent = () => {
  const { state } = useMap();

  return (
    <div className="app">
      <MenuBar />
      <IconToolbar />
      <main className="app-content">
        {state.view === 'timeline' ? <TimelineView /> : <MapContainer />}
      </main>
    </div>
  );
};

const MainLayout = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>; // Or a spinner

  if (!user) {
    return <Login />;
  }

  return (
    <MapProvider userId={user.id}>
      <AppContent />
    </MapProvider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
