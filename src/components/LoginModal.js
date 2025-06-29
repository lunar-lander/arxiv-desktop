import React, { useState } from 'react';
import { X, User, Lock, LogIn } from 'lucide-react';
import { AuthService } from '../services/authService';
import styles from './LoginModal.module.css';


function LoginModal({ isOpen, onClose, onLogin }) {
  const [selectedSource, setSelectedSource] = useState('arxiv');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let result;
      if (selectedSource === 'arxiv') {
        result = await AuthService.loginToArxiv(username, password);
      } else {
        result = await AuthService.loginToBiorxiv(username, password);
      }

      if (result.success) {
        onLogin(result.user);
        onClose();
        setUsername('');
        setPassword('');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={20} />
        </button>
        
        <h2 className={styles.modalTitle}>Login to Access Papers</h2>
        
        <div className={styles.infoMessage}>
          Note: Authentication is currently stored locally for future enhanced features. 
          Both arXiv and bioRxiv papers can be searched and downloaded without login.
        </div>

        <div className={styles.sourceTabs}>
          <button
            className={`${styles.sourceTab} ${selectedSource === 'arxiv' ? styles.active : ''}`}
            onClick={() => setSelectedSource('arxiv')}
          >
            arXiv
          </button>
          <button
            className={`${styles.sourceTab} ${selectedSource === 'biorxiv' ? styles.active : ''}`}
            onClick={() => setSelectedSource('biorxiv')}
          >
            bioRxiv
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <div className={styles.inputIcon}>
              <User size={18} />
            </div>
            <input
              className={styles.input}
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.inputIcon}>
              <Lock size={18} />
            </div>
            <input
              className={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className={styles.loginButton} type="submit" disabled={isLoading}>
            <LogIn size={18} />
            {isLoading ? 'Logging in...' : `Login to ${selectedSource}`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginModal;