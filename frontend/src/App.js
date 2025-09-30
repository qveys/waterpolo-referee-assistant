import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:3001';

function App() {
  // États
  const [activeTab, setActiveTab] = useState('agent');
  const [question, setQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ rules: 0, definitions: 0 });
  const [error, setError] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Chargement des stats au démarrage
  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // ==================== API CALLS ====================

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchArticle = async (articleNumber) => {
    setArticleLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/article/${articleNumber}`);
      if (!response.ok) throw new Error('Article not found');
      const data = await response.json();
      setSelectedArticle(data);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError(`Impossible de charger l'article ${articleNumber}`);
    } finally {
      setArticleLoading(false);
    }
  };

  const askAgent = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);

    const userMessage = { type: 'user', text: question, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/agent/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, maxContext: 3 })
      });

      if (!response.ok) throw new Error('API error');

      const data = await response.json();

      const botMessage = {
        type: 'bot',
        text: data.answer,
        references: data.references,
        timestamp: new Date()
      };

      setChatHistory(prev => [...prev, botMessage]);
      setQuestion('');

    } catch (err) {
      setError('Erreur lors de la communication avec l\'agent');
      console.error('Agent error:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchRules = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/search/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, maxResults: 10 })
      });

      if (!response.ok) throw new Error('Search API error');

      const data = await response.json();
      setSearchResults(data.results);

    } catch (err) {
      setError('Erreur lors de la recherche');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      action();
    }
  };

  // ==================== QUICK QUESTIONS ====================

  const quickQuestions = [
    "Quelle est la durée d'une exclusion ?",
    "Combien de joueurs par équipe ?",
    "Qu'est-ce qu'un penalty ?",
    "Distance de la ligne de penalty ?"
  ];

  // ==================== RENDER ====================

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>🏊 Waterpolo Referee Assistant</h1>
          <div className="stats-bar">
            <span>{stats.rules} règles</span>
            <span>{stats.definitions} définitions</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'agent' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent')}
        >
          💬 Agent Conversationnel
        </button>
        <button
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Recherche de Règles
        </button>
      </div>

      {/* Content */}
      <main className="main-content">
        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {/* TAB 1: Agent Conversationnel */}
        {activeTab === 'agent' && (
          <div className="agent-tab">
            <div className="chat-container">
              {chatHistory.length === 0 && (
                <div className="welcome-message">
                  <h2>Posez vos questions sur les règles de water-polo</h2>
                  <div className="quick-questions">
                    {quickQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        className="quick-question-btn"
                        onClick={() => {
                          setQuestion(q);
                          setTimeout(() => askAgent(), 100);
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="chat-messages">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.type}`}>
                    <div className="message-content">
                      <p>{msg.text}</p>
                      {msg.references && (
                        <div className="references">
                          <strong>Références:</strong>
                          {msg.references.map((ref, i) => (
                            <button
                              key={i}
                              className="reference-tag clickable"
                              onClick={() => fetchArticle(ref.article)}
                              title={ref.title}
                            >
                              Art. {ref.article}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="message-time">
                      {msg.timestamp.toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="input-container">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, askAgent)}
                placeholder="Posez votre question sur les règles..."
                rows="3"
                disabled={loading}
              />
              <button 
                onClick={askAgent} 
                disabled={loading || !question.trim()}
                className="send-button"
              >
                {loading ? '⏳' : '📤'} Envoyer
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Recherche de Règles */}
        {activeTab === 'search' && (
          <div className="search-tab">
            <div className="search-input-container">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, searchRules)}
                placeholder="Rechercher dans les règles (ex: exclusion, penalty)..."
                disabled={loading}
              />
              <button 
                onClick={searchRules} 
                disabled={loading || !searchQuery.trim()}
                className="search-button"
              >
                {loading ? '⏳' : '🔍'} Rechercher
              </button>
            </div>

            <div className="search-results">
              {searchResults.length > 0 ? (
                <>
                  <div className="results-header">
                    {searchResults.length} résultat(s) trouvé(s)
                  </div>
                  {searchResults.map((result, idx) => (
                    <div key={idx} className="result-card">
                      <div className="result-header">
                        <span className="article-badge">Article {result.article}</span>
                        <span className="score-badge">Score: {result.score?.toFixed(2)}</span>
                      </div>
                      <h3>{result.title}</h3>
                      <p 
                        className="result-content"
                        dangerouslySetInnerHTML={{ 
                          __html: result.highlight || result.content 
                        }}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <div className="no-results">
                  {searchQuery ? (
                    <>
                      <p>Aucun résultat pour "{searchQuery}"</p>
                      <p className="hint">Essayez des mots-clés comme: faute, exclusion, penalty, gardien, temps</p>
                    </>
                  ) : (
                    <p>Effectuez une recherche pour afficher les résultats</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Article Modal */}
      {selectedArticle && (
        <div className="modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Article {selectedArticle.article}</h2>
              <button className="close-button" onClick={() => setSelectedArticle(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <h3>{selectedArticle.title}</h3>
              <p className="article-content">{selectedArticle.content}</p>
              {selectedArticle.category && (
                <div className="article-meta">
                  <span className="category-badge">{selectedArticle.category}</span>
                </div>
              )}
              {selectedArticle.keywords && selectedArticle.keywords.length > 0 && (
                <div className="article-keywords">
                  <strong>Mots-clés:</strong>{' '}
                  {selectedArticle.keywords.map((kw, idx) => (
                    <span key={idx} className="keyword-tag">{kw}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>🏆 AI Accelerate Hackathon 2025 - Elastic Challenge</p>
        <p className="status-indicator">
          ● Elasticsearch: {stats.rules > 0 ? 'Connecté' : 'Déconnecté'}
        </p>
      </footer>
    </div>
  );
}

export default App;
