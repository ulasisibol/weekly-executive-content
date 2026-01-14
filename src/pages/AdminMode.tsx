import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeeks, removeVideoFromDay, createWeek } from '../dataService';
import { Week } from '../types';
import Sidebar from '../components/Sidebar';
import AdminEdit from '../components/AdminEdit';
import WeekDetail from '../components/WeekDetail';
import { Lock, Eye, ChevronLeft, ChevronRight, Plus, Menu } from 'lucide-react';

export default function AdminMode() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobil sidebar toggle
  const navigate = useNavigate();

  const loadWeeks = async () => {
    try {
      const loadedWeeks = await getWeeks();
      setWeeks(loadedWeeks);
      if (loadedWeeks.length > 0 && !selectedWeekId) {
        setSelectedWeekId(loadedWeeks[0].id);
      }
    } catch (error) {
      console.error('Haftalar yüklenirken hata:', error);
    }
  };

  useEffect(() => {
    loadWeeks();
  }, []);

  const handleSave = () => {
    loadWeeks();
  };

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId);
  const currentIndex = weeks.findIndex((w) => w.id === selectedWeekId);

  const handlePreviousWeek = () => {
    if (currentIndex > 0) {
      setSelectedWeekId(weeks[currentIndex - 1].id);
      setIsEditMode(false);
    }
  };

  const handleNextWeek = () => {
    if (currentIndex < weeks.length - 1) {
      setSelectedWeekId(weeks[currentIndex + 1].id);
      setIsEditMode(false);
    }
  };

  const handleRemoveVideo = async (dayId: string, videoId: string) => {
    if (selectedWeek) {
      try {
        await removeVideoFromDay(selectedWeek.id, dayId, videoId);
        await loadWeeks();
      } catch (error) {
        console.error('Video silinirken hata:', error);
        alert('Video silinirken bir hata oluştu.');
      }
    }
  };

  const handleCreateWeek = async () => {
    try {
      // Önce yeni haftanın tarih aralığını hesapla (oluşturmadan önce)
      const lastWeek = weeks.length > 0 
        ? weeks.reduce((latest, week) => {
            const latestDate = new Date(latest.endDate + 'T00:00:00Z');
            const weekDate = new Date(week.endDate + 'T00:00:00Z');
            return weekDate > latestDate ? week : latest;
          })
        : null;

      let nextWeekStart: Date;
      let nextWeekEnd: Date;
      let weekNumber: number;

      if (lastWeek) {
        const lastEndDate = new Date(lastWeek.endDate + 'T00:00:00Z');
        nextWeekStart = new Date(lastEndDate);
        nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 1);
        
        // Pazartesi gününü bul
        const dayOfWeek = nextWeekStart.getUTCDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() - daysToSubtract);
        nextWeekStart.setUTCHours(0, 0, 0, 0);
        
        nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setUTCDate(nextWeekEnd.getUTCDate() + 6);
        
        // Hafta numarasını hesapla
        const weekNumbers = weeks.map(w => {
          const match = w.title.match(/^(\d+)\./);
          return match ? parseInt(match[1], 10) : 0;
        });
        weekNumber = Math.max(...weekNumbers, 0) + 1;
      } else {
        const today = new Date();
        const dayOfWeek = today.getUTCDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        nextWeekStart = new Date(today);
        nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() - daysToSubtract);
        nextWeekStart.setUTCHours(0, 0, 0, 0);
        
        nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setUTCDate(nextWeekEnd.getUTCDate() + 6);
        weekNumber = 1;
      }

      // Tarih formatını hazırla
      const startDateStr = nextWeekStart.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const endDateStr = nextWeekEnd.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Haftayı direkt oluştur
      const newWeek = await createWeek();
      
      // State'i güncelle - önce haftaları yeniden yükle
      await loadWeeks();
      
      // Yeni haftayı seç
      setSelectedWeekId(newWeek.id);
      setIsEditMode(false);
      
      // Bilgi mesajı göster - createWeek içinde hesaplanan hafta numarasını kullan
      const createdWeekNumber = newWeek.title.match(/^(\d+)\./)?.[1] || weekNumber.toString();
      setNotification({
        message: `${createdWeekNumber}. Hafta oluşturuldu: ${startDateStr} - ${endDateStr}`,
        type: 'success'
      });
      
      // 3 saniye sonra mesajı kaldır
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error: any) {
      console.error('Hafta oluşturma hatası:', error);
      const errorMessage = error?.message || 'Bilinmeyen hata';
      setNotification({
        message: `Hafta oluşturulamadı: ${errorMessage}. Lütfen konsolu kontrol edin.`,
        type: 'info'
      });
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        weeks={weeks}
        selectedWeekId={selectedWeekId}
        onSelectWeek={(id) => {
          setSelectedWeekId(id);
          setIsEditMode(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col">
        {notification && (
          <div className={`mx-4 mt-4 px-4 py-3 rounded-lg shadow-md ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 ml-4"
              >
                ×
              </button>
            </div>
          </div>
        )}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Mobil hamburger menü butonu */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
              aria-label="Menüyü aç"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            {/* Küçük kilit ikonu - Yönetici Modu */}
            <div className="p-2" title="Yönetici Modu">
              <Lock className="w-5 h-5 text-[#0078d4]" />
            </div>
          </div>

          {selectedWeek && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handlePreviousWeek}
                disabled={currentIndex === 0}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextWeek}
                disabled={currentIndex === weeks.length - 1}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleCreateWeek}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Yeni Hafta
            </button>
            {selectedWeek && (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isEditMode
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-[#0078d4] text-white hover:bg-[#106ebe]'
                }`}
              >
                {isEditMode ? (
                  <>
                    <Eye className="w-4 h-4" />
                    Göster
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Düzenle
                  </>
                )}
              </button>
            )}
            {/* Görüntüleme Modu butonu */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              title="Görüntüleme Moduna Geç"
            >
              <Eye className="w-4 h-4" />
              Görüntüle
            </button>
          </div>
        </div>

        {selectedWeek ? (
          isEditMode ? (
            <AdminEdit 
              week={selectedWeek} 
              onSave={handleSave}
              onWeekDeleted={() => {
                setSelectedWeekId(null);
                setIsEditMode(false);
                loadWeeks();
              }}
            />
          ) : (
            <WeekDetail
              week={selectedWeek}
              isAdmin={true}
              onRemoveVideo={handleRemoveVideo}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Bir hafta seçin</p>
              <p className="text-gray-400 text-sm mt-2">Sol taraftan hafta seçerek başlayın</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
