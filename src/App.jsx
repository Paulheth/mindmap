import React from 'react';
import { MapProvider, useMap } from './context/MapContext';
import MapContainer from './components/MindMap/MapContainer';
import TimelineView from './components/Timeline/TimelineView';
import MenuBar from './components/Layout/MenuBar';
import IconToolbar from './components/Layout/IconToolbar';
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

const App = () => {
  return (
    <MapProvider>
      <AppContent />
    </MapProvider>
  );
};

export default App;
