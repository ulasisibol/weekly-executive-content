import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeeks, ensureNextWeekExists } from '../dataService';
import { Week } from '../types';
import Sidebar from '../components/Sidebar';
import WeekDetail from '../components/WeekDetail';
import { Lock, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ViewMode() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // ViewMode'da otomatik hafta oluşturmayı tetikle
    ensureNextWeekExists();
    const loadedWeeks = getWeeks().filter(w => w.status === 'published');
    setWeeks(loadedWeeks);
    if (loadedWeeks.length > 0) {
      setSelectedWeekId(loadedWeeks[0].id);
    }
  }, []);

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId);
  const currentIndex = weeks.findIndex((w) => w.id === selectedWeekId);

  const handlePreviousWeek = () => {
    if (currentIndex > 0) {
      setSelectedWeekId(weeks[currentIndex - 1].id);
    }
  };

  const handleNextWeek = () => {
    if (currentIndex < weeks.length - 1) {
      setSelectedWeekId(weeks[currentIndex + 1].id);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        weeks={weeks}
        selectedWeekId={selectedWeekId}
        onSelectWeek={setSelectedWeekId}
      />

      {selectedWeek ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Görüntüleme Modu</span>
            </div>

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

            <button
              onClick={() => navigate('/admin')}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Lock className="w-4 h-4 inline mr-2" />
              Yönetici
            </button>
          </div>
          <WeekDetail week={selectedWeek} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg">Henüz yayınlanmış hafta yok</p>
            <button
              onClick={() => navigate('/admin')}
              className="mt-4 px-6 py-2.5 bg-[#0078d4] text-white rounded-lg hover:bg-[#106ebe] transition-colors"
            >
              Yönetici Moduna Git
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
