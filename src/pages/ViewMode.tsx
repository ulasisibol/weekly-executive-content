import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeeks, ensureNextWeekExists } from '../dataService';
import { Week } from '../types';
import Sidebar from '../components/Sidebar';
import WeekDetail from '../components/WeekDetail';
import { Lock, Eye, ChevronLeft, ChevronRight, Calendar, Menu } from 'lucide-react';

export default function ViewMode() {
  const [allWeeks, setAllWeeks] = useState<Week[]>([]); // Tüm haftalar (published ve draft)
  const [weeks, setWeeks] = useState<Week[]>([]); // Görüntülenen haftalar (filtreleme sonrası)
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(''); // Tarih filtresi
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobil sidebar toggle
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const mobileDateInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Haftaları yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true); // Loading başlat
        // ViewMode'da otomatik hafta oluşturmayı tetikle
        await ensureNextWeekExists();
        const loadedWeeks = await getWeeks();
        
        // GÖREV 1 DÜZELTME: Tüm haftaları göster (published, draft, hepsi)
        // Kullanıcı görüntüleme modunda tüm haftaları görebilmeli
        console.log('📅 Yüklenen haftalar (ViewMode):', {
          toplamHafta: loadedWeeks.length,
          haftalar: loadedWeeks.map(w => ({ 
            id: w.id, 
            title: w.title, 
            status: w.status,
            startDate: w.startDate,
            endDate: w.endDate
          }))
        });
        
        // Tüm haftaları göster (status filtresi yok)
        setAllWeeks(loadedWeeks);
        setWeeks(loadedWeeks);
        
        if (loadedWeeks.length > 0) {
          // En son eklenen (ilk sıradaki) haftayı seç
          setSelectedWeekId(loadedWeeks[0].id);
          console.log('✅ İlk hafta seçildi:', loadedWeeks[0].title);
        }
      } catch (error) {
        console.error('❌ Haftalar yüklenirken hata:', error);
      } finally {
        setIsLoading(false); // Loading bitir
      }
    };
    loadData();
  }, []);

  // GÖREV 3 DÜZELTME: Tarih filtresi - Seçilen tarihe göre haftaları filtrele
  useEffect(() => {
    if (!selectedDate || selectedDate === '') {
      // Filtre yoksa tüm haftaları göster
      console.log('🔄 Tarih filtresi temizlendi, tüm haftalar gösteriliyor');
      setWeeks(allWeeks);
      if (allWeeks.length > 0 && !selectedWeekId) {
        setSelectedWeekId(allWeeks[0].id);
      }
      return;
    }

    // Seçilen tarihi içeren haftayı bul
    const filteredWeeks = allWeeks.filter(week => {
      if (!week.startDate || !week.endDate) {
        console.warn('⚠️ Hafta tarih bilgisi eksik:', week.title);
        return false;
      }
      
      try {
        // Tarih karşılaştırması için UTC kullan
        const selectedDateObj = new Date(selectedDate + 'T00:00:00Z');
        const weekStartDate = new Date(week.startDate + 'T00:00:00Z');
        const weekEndDate = new Date(week.endDate + 'T00:00:00Z');
        
        console.log('📊 Tarih karşılaştırması:', {
          hafta: week.title,
          secilenTarih: selectedDate,
          haftaBaslangic: week.startDate,
          haftaBitis: week.endDate,
          aralikIcinde: selectedDateObj >= weekStartDate && selectedDateObj <= weekEndDate
        });
        
        // Seçilen tarih hafta aralığında mı?
        return selectedDateObj >= weekStartDate && selectedDateObj <= weekEndDate;
      } catch (error) {
        console.error('❌ Tarih karşılaştırma hatası:', error, week);
        return false;
      }
    });

    console.log('🔍 Tarih filtresi sonucu:', {
      secilenTarih: selectedDate,
      bulunanHaftaSayisi: filteredWeeks.length,
      bulunanHaftalar: filteredWeeks.map(w => w.title)
    });

    // Eğer tarih bulunamadıysa, uyarı göster ve son haftaya dön
    if (filteredWeeks.length === 0) {
      console.log('⚠️ Seçilen tarihte hafta bulunamadı, son haftaya dönülüyor');
      
      // Tüm haftaları göster
      setWeeks(allWeeks);
      
      // Son eklenen haftaya dön (en üstteki - ilk sıradaki)
      if (allWeeks.length > 0) {
        setSelectedWeekId(allWeeks[0].id);
        console.log('✅ Son haftaya dönüldü:', allWeeks[0].title);
      }
      
      // Tarih filtresini temizle
      setSelectedDate('');
      
      // Kullanıcıya bilgi ver (3 saniye sonra kaybolacak)
      alert(`Girdiğiniz tarihe ait bir hafta bulunamadı. Son eklenen haftaya dönülüyor.`);
      
      return;
    }
    
    setWeeks(filteredWeeks);
    
    // Filtreleme sonrası ilk haftayı seç
    if (filteredWeeks.length > 0) {
      setSelectedWeekId(filteredWeeks[0].id);
      console.log('✅ Filtrelenen hafta seçildi:', filteredWeeks[0].title);
    }
  }, [selectedDate, allWeeks, selectedWeekId]);

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
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Loading State */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078d4] mb-4"></div>
            <p className="text-gray-500 text-lg">Yükleniyor...</p>
          </div>
        </div>
      ) : selectedWeek || weeks.length > 0 ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-3">
            {/* Üst Satır: Hamburger Menü ve Yönetici Butonu */}
            <div className="flex justify-between items-center">
              {/* Mobil hamburger menü butonu */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Menüyü aç"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              
              {/* Desktop'ta boş alan */}
              <div className="hidden lg:block"></div>

              {/* Yönetici butonu - küçük kilit ikonu */}
              <button
                onClick={() => navigate('/admin')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Yönetici moduna geç"
                title="Yönetici Modu"
              >
                <Lock className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Alt Satır: Tarih Filtresi (Desktop) ve Navigasyon */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Tarih Filtresi - Sadece Desktop'ta görünür */}
              <div className="hidden lg:flex items-center gap-2 flex-1">
                <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    console.log('📅 Tarih seçildi:', newDate);
                    setSelectedDate(newDate);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:border-transparent"
                  placeholder="GG/AA/YYYY"
                  title="Tarih seçerek filtreleme yapabilirsiniz"
                  lang="tr"
                />
                {selectedDate && (
                  <button
                    onClick={() => {
                      console.log('🔄 Tarih filtresi temizleniyor');
                      setSelectedDate('');
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors whitespace-nowrap"
                  >
                    ✕ Temizle
                  </button>
                )}
              </div>
              
              {/* Mobilde seçili tarih gösterimi */}
              {selectedDate && (
                <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">
                    {new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  <button
                    onClick={() => {
                      console.log('🔄 Tarih filtresi temizleniyor');
                      setSelectedDate('');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Hafta Navigasyonu ve Mobil Tarih Seçme */}
              <div className="flex gap-2 items-center justify-between w-full">
                {/* Sol taraf: Navigasyon butonları */}
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
                
                {/* Sağ taraf: Mobilde takvim ikonu - tarih seçme */}
                <div className="lg:hidden relative">
                  <input
                    ref={mobileDateInputRef}
                    type="date"
                    id="mobile-date-input"
                    value={selectedDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      console.log('📅 Tarih seçildi:', newDate);
                      setSelectedDate(newDate);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    style={{ fontSize: '16px' }} // iOS'ta zoom'u önlemek için
                  />
                  <div
                    className={`p-2 hover:bg-gray-100 rounded-lg transition-colors relative pointer-events-none ${
                      selectedDate ? 'bg-blue-50' : ''
                    }`}
                    aria-label="Tarih seç"
                    title={selectedDate ? `Seçili: ${new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('tr-TR')}` : 'Tarih seç'}
                  >
                    <Calendar className={`w-5 h-5 ${selectedDate ? 'text-blue-600' : 'text-gray-600'}`} />
                    {selectedDate && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                </div>
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
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Henüz hafta yok</p>
            <p className="text-gray-400 text-sm mt-2 mb-4">Yönetici modundan yeni hafta oluşturabilirsiniz</p>
            <button
              onClick={() => navigate('/admin')}
              className="px-6 py-2.5 bg-[#0078d4] text-white rounded-lg hover:bg-[#106ebe] transition-colors"
            >
              Yönetici Moduna Git
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
