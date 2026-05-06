import React, { useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, fetchHCPs, fetchInteractions, setActiveTab } from './store/store';
import LogInteractionForm from './components/LogInteractionForm';
import ChatInterface from './components/ChatInterface';
import InteractionsList from './components/InteractionsList';
import './App.css';

function AppContent() {
  const dispatch = useDispatch();
  const { activeTab, successMessage, error } = useSelector(state => state.crm);

  // Load HCPs and interactions when app starts
  useEffect(() => {
    dispatch(fetchHCPs());
    dispatch(fetchInteractions());
  }, [dispatch]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🧬</span>
            <span className="logo-text">Aivoa<span className="logo-accent">.ai</span></span>
          </div>
          <div className="header-subtitle">HCP Interaction Module</div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="app-main">
        {/* Left Panel — Log Interaction */}
        <section className="panel panel-left">
          <div className="panel-header">
            <h2>Log HCP Interaction</h2>
            {/* Tab switcher */}
            <div className="tab-switcher">
              <button
                className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
                onClick={() => dispatch(setActiveTab('form'))}
              >
                📋 Form
              </button>
              <button
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => dispatch(setActiveTab('chat'))}
              >
                🤖 AI Chat
              </button>
            </div>
          </div>

          {/* Toast notifications */}
          {successMessage && (
            <div className="toast toast-success">{successMessage}</div>
          )}
          {error && (
            <div className="toast toast-error">{error}</div>
          )}

          {/* Tab content */}
          {activeTab === 'form' ? <LogInteractionForm /> : <ChatInterface />}
        </section>

        {/* Right Panel — Interactions List */}
        <section className="panel panel-right">
          <div className="panel-header">
            <h2>📁 Logged Interactions</h2>
          </div>
          <InteractionsList />
        </section>
      </main>
    </div>
  );
}

// Wrap with Redux Provider so all components can access the store
function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;