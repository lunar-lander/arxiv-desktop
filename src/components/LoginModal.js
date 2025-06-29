import React, { useState } from 'react';
import styled from 'styled-components';
import { X, User, Lock, LogIn } from 'lucide-react';
import { AuthService } from '../services/authService';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 400px;
  max-width: 90vw;
  position: relative;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #7f8c8d;
  padding: 0.5rem;
  border-radius: 6px;
  transition: color 0.2s;

  &:hover {
    color: #2c3e50;
  }
`;

const ModalTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  text-align: center;
`;

const SourceTabs = styled.div`
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e0e6ed;
`;

const SourceTab = styled.button`
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? '#3498db' : 'transparent'};
  color: ${props => props.active ? '#3498db' : '#7f8c8d'};
  font-weight: ${props => props.active ? '600' : '400'};
  transition: all 0.2s;

  &:hover {
    color: #3498db;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InputGroup = styled.div`
  position: relative;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #7f8c8d;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: 2px solid #e0e6ed;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #3498db;
  }
`;

const LoginButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 0.5rem;

  &:hover {
    background: #2980b9;
  }

  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #fdeaea;
  border: 1px solid #f5b7b1;
  color: #e74c3c;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const InfoMessage = styled.div`
  background: #ebf3fd;
  border: 1px solid #a6c8ff;
  color: #2980b9;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

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
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>
        
        <ModalTitle>Login to Access Papers</ModalTitle>
        
        <InfoMessage>
          Note: Authentication is currently stored locally for future enhanced features. 
          Both arXiv and bioRxiv papers can be searched and downloaded without login.
        </InfoMessage>

        <SourceTabs>
          <SourceTab
            active={selectedSource === 'arxiv'}
            onClick={() => setSelectedSource('arxiv')}
          >
            arXiv
          </SourceTab>
          <SourceTab
            active={selectedSource === 'biorxiv'}
            onClick={() => setSelectedSource('biorxiv')}
          >
            bioRxiv
          </SourceTab>
        </SourceTabs>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <InputIcon>
              <User size={18} />
            </InputIcon>
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </InputGroup>

          <InputGroup>
            <InputIcon>
              <Lock size={18} />
            </InputIcon>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </InputGroup>

          <LoginButton type="submit" disabled={isLoading}>
            <LogIn size={18} />
            {isLoading ? 'Logging in...' : `Login to ${selectedSource}`}
          </LoginButton>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
}

export default LoginModal;