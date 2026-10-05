import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ClickSpark from './components/ui/ClickSpark';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClickSpark
      sparkColor="#18181b"
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
      <App />
    </ClickSpark>
  </StrictMode>,
);
