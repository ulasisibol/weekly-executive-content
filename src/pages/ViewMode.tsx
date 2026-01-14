import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeeks, ensureNextWeekExists } from '../dataService';
import { Week } from '../types';
import Sidebar from '../components/Sidebar';
import WeekDetail from '../components/WeekDetail';
import { Lock, Eye, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function ViewMode() {
  const [allWeeks, setAllWeeks] = useState<Week[]>([]); // Tüm haftalar (published ve draft)
  const [weeks, setWeeks] = useState<Week[]>([]); // Görüntülenen haftalar (filtreleme sonrası)
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(''); // Tarih filtresi
  const navigate = useNavigate();

  // Haftaları yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        // ViewMode'da otomatik hafta oluşturmayı tetikle
        await ensureNextWeekExists();
        const loadedWeeks = await getWeeks();
        
        // GÖREV 1: Tüm published haftaları göster (en yeni en üstte)
        // getWeeks zaten desc sıralama yapıyor, bu yüzden sıralama doğru
        const publishedWeeks = loadedWeeks.filter(w => w.status === 'published');
        
        console.log('📅 Yüklenen haftalar:', {
          toplamHafta: loadedWeeks.length,
          publishedHafta: publishedWeeks.length,
          haftalar: publishedWeeks.map(w => ({ id: w.id, title: w.title, startDate: w.startDate }))
        });
        
        setAllWeeks(publishedWeeks);
        setWeeks(publishedWeeks); // Başlangıçta filtre yok, tüm haftalar gösterilir
        
        if (publishedWeeks.length > 0) {
          // En son eklenen (ilk sıradaki) haftayı seç
          setSelectedWeekId(publishedWeeks[0].id);
        }
      } catch (error) {
        console.error('Haftalar yüklenirken hata:', error);
      }
    };
    loadData();
  }, []);

  // GÖREV 3: Tarih filtresi - Seçilen tarihe göre haftaları filtrele
  useEffect(() => {
    if (!selectedDate || selectedDate === '') {
      // Filtre yoksa tüm haftaları göster
      setWeeks(allWeeks);
      return;
    }

    // Seçilen tarihi içeren haftayı bul
    const filteredWeeks = allWeeks.filter(week => {
      if (!week.startDate || !week.endDate) return false;
      
      const selectedDateObj = new Date(selectedDate + 'T00:00:00Z');
      const weekStartDate = new Date(week.startDate + 'T00:00:00Z');
      const weekEndDate = new Date(week.endDate + 'T00:00:00Z');
      
      // Seçilen tarih hafta aralığında mı?
      return selectedDateObj >= weekStartDate && selectedDateObj <= weekEndDate;
    });

    console.log('🔍 Tarih filtresi:', {
      secilenTarih: selectedDate,
      bulunanHaftalar: filteredWeeks.length,
      haftalar: filteredWeeks.map(w => w.title)
    });

    setWeeks(filteredWeeks);
    
    // Filtreleme sonrası ilk haftayı seç
    if (filteredWeeks.length > 0) {
      setSelectedWeekId(filteredWeeks[0].id);
    } else {
      setSelectedWeekId(null);
    }
  }, [selectedDate, allWeeks]);

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

      {selectedWeek || weeks.length > 0 ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-3">
            {/* Üst Satır: Mod Başlığı ve Yönetici Butonu */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Görüntüleme Modu</span>
                {weeks.length > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({weeks.length} hafta)
                  </span>
                )}
              </div>

              <button
                onClick={() => navigate('/admin')}
                className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <Lock className="w-4 h-4 inline mr-2" />
                Yönetici
              </button>
            </div>

            {/* Alt Satır: Tarih Filtresi ve Navigasyon */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Tarih Filtresi */}
              <div className="flex items-center gap-2 flex-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:border-transparent"
                  placeholder="Tarih seçin"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Temizle
                  </button>
                )}
              </div>

              {/* Hafta Navigasyonu */}
              <div className="flex gap-2">
                <button
                  onClick={handlePreviousWeek}
                  disabled={currentIndex === 0}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  title="Önceki Hafta"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextWeek}
                  disabled={currentIndex === weeks.length - 1}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  title="Sonraki Hafta"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {selectedWeek ? (
            <WeekDetail week={selectedWeek} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">Seçilen tarihte hafta bulunamadı</p>
                <p className="text-gray-400 text-sm mb-4">
                  {selectedDate ? `${new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihinde içerik yok` : 'Lütfen bir tarih seçin'}
                </p>
                <button
                  onClick={() => setSelectedDate('')}
                  className="px-4 py-2 text-sm text-[#0078d4] hover:text-[#106ebe] transition-colors"
                >
                  Filtreyi Temizle
                </button>
              </div>
            </div>
          )}
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
