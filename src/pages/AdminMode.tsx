import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeeks, removeVideoFromDay } from '../dataService';
import { Week } from '../types';
import Sidebar from '../components/Sidebar';
import AdminEdit from '../components/AdminEdit';
import WeekDetail from '../components/WeekDetail';
import { Lock, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminMode() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const navigate = useNavigate();

  const loadWeeks = () => {
    const loadedWeeks = getWeeks();
    setWeeks(loadedWeeks);
    if (loadedWeeks.length > 0 && !selectedWeekId) {
      setSelectedWeekId(loadedWeeks[0].id);
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

  const handleRemoveVideo = (dayId: string, videoId: string) => {
    if (selectedWeek) {
      removeVideoFromDay(selectedWeek.id, dayId, videoId);
      loadWeeks();
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
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#0078d4]" />
            <span className="text-sm font-medium text-gray-700">Yönetici Modu</span>
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
            <button
              onClick={() => navigate('/')}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Görüntüle
            </button>
          </div>
        </div>

        {selectedWeek ? (
          isEditMode ? (
            <AdminEdit week={selectedWeek} onSave={handleSave} />
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
