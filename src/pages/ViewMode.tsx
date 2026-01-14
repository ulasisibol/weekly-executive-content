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
        
        console.log('📅 Yüklenen haftalar (ViewMode - Sıralama öncesi):', {
          toplamHafta: loadedWeeks.length,
          haftalar: loadedWeeks.map(w => ({ 
            id: w.id, 
            title: w.title, 
            status: w.status,
            startDate: w.startDate,
            endDate: w.endDate
          }))
        });
        
        // ÖNEMLİ: Bugüne göre sıralama - Bugünü içeren hafta en üstte
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Sadece tarih, saat bilgisi yok
        
        const sortedWeeks = [...loadedWeeks].sort((a, b) => {
          // Her hafta için bugüne olan "mesafe" hesapla
          const getDistanceToToday = (week: Week): number => {
            if (!week.startDate || !week.endDate) return Infinity; // Geçersiz tarihler en sona
            
            try {
              const weekStart = new Date(week.startDate + 'T00:00:00Z');
              const weekEnd = new Date(week.endDate + 'T00:00:00Z');
              
              // Bugün bu hafta içinde mi?
              if (today >= weekStart && today <= weekEnd) {
                return 0; // Bugünü içeren hafta = 0 (en üstte)
              }
              
              // Hafta gelecekte mi?
              if (today < weekStart) {
                // Hafta başına kadar olan gün sayısı (pozitif)
                return Math.ceil((weekStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              }
              
              // Hafta geçmişte mi?
              if (today > weekEnd) {
                // Hafta bitişinden bugüne kadar olan gün sayısı (negatif)
                return -Math.ceil((today.getTime() - weekEnd.getTime()) / (1000 * 60 * 60 * 24));
              }
              
              return 0;
            } catch (error) {
              console.error('❌ Tarih hesaplama hatası:', error, week);
              return Infinity;
            }
          };
          
          const distanceA = getDistanceToToday(a);
          const distanceB = getDistanceToToday(b);
          
          // Önce bugüne olan mesafeye göre sırala
          if (Math.abs(distanceA) !== Math.abs(distanceB)) {
            return Math.abs(distanceA) - Math.abs(distanceB);
          }
          
          // Eşit mesafedeyse, gelecek haftaları önce göster
          return distanceB - distanceA;
        });
        
        console.log('🎯 Bugüne göre sıralanmış haftalar:', {
          bugun: today.toISOString().split('T')[0],
          haftalar: sortedWeeks.map(w => {
            const weekStart = w.startDate ? new Date(w.startDate + 'T00:00:00Z') : null;
            const weekEnd = w.endDate ? new Date(w.endDate + 'T00:00:00Z') : null;
            const isCurrentWeek = weekStart && weekEnd && today >= weekStart && today <= weekEnd;
            
            return {
              title: w.title,
              startDate: w.startDate,
              endDate: w.endDate,
              bugunuIcerir: isCurrentWeek ? '✅ AKTİF' : '⏳'
            };
          })
        });
        
        // Sıralanmış haftaları kaydet
        setAllWeeks(sortedWeeks);
        setWeeks(sortedWeeks);
        
        if (sortedWeeks.length > 0) {
          // Bugünü içeren haftayı seç (en üstteki)
          setSelectedWeekId(sortedWeeks[0].id);
          console.log('✅ Aktif hafta seçildi:', sortedWeeks[0].title);
        }
      } catch (error) {
        console.error('❌ Haftalar yüklenirken hata:', error);
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

    setWeeks(filteredWeeks);
    
    // Filtreleme sonrası ilk haftayı seç veya seçimi temizle
    if (filteredWeeks.length > 0) {
      setSelectedWeekId(filteredWeeks[0].id);
      console.log('✅ Filtrelenen hafta seçildi:', filteredWeeks[0].title);
    } else {
      setSelectedWeekId(null);
      console.log('⚠️ Seçilen tarihte hafta bulunamadı');
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
      />

      {selectedWeek || weeks.length > 0 ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-3">
            {/* Üst Satır: Mod Başlığı ve Yönetici Butonu */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">Görüntüleme Modu</span>
                </div>
                {allWeeks.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                      {allWeeks.length} Hafta
                    </span>
                    {selectedDate && weeks.length !== allWeeks.length && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                        {weeks.length} Filtrelendi
                      </span>
                    )}
                  </div>
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
