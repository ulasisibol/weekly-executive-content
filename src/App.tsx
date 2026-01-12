import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ViewMode from './pages/ViewMode';
import AdminMode from './pages/AdminMode';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ViewMode />} />
        <Route path="/admin" element={<AdminMode />} />
      </Routes>
    </Router>
  );
}

export default App;
