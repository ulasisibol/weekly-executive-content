import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Providers } from '@microsoft/mgt-element';
import { Login } from '@microsoft/mgt-react';
import ViewMode from './pages/ViewMode';
import AdminMode from './pages/AdminMode';

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const provider = Providers.globalProvider;
        if (provider) {
          const account = await provider.getAccount();
          setIsSignedIn(!!account);
        } else {
          setIsSignedIn(false);
        }
      } catch (error) {
        console.error('Auth kontrolü hatası:', error);
        setIsSignedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Periyodik olarak auth durumunu kontrol et (Login component otomatik günceller ama yine de kontrol edelim)
    const interval = setInterval(checkAuth, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078d4] mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Haftalık İçerik Yönetim Sistemi
            </h1>
            <p className="text-gray-600 text-sm">
              Devam etmek için Microsoft hesabınızla giriş yapın
            </p>
          </div>
          <div className="flex justify-center">
            <Login />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ViewMode />} />
        <Route path="/admin" element={<AdminMode />} />
        {/* 404 durumunda ana sayfaya yönlendir */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
