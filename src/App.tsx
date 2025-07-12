// src/App.tsx
import WordSearchGame from './components/WordSearchGame'; // Correct path to your new component
import './App.css'; // Keep this if you want default Vite styling, otherwise remove

function App() {
  return (
    <div className="App">
      <WordSearchGame />
    </div>
  );
}

export default App;