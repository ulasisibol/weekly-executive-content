import { Week } from '../types';
import DayContent from './DayContent';

interface WeekDetailProps {
  week: Week;
  isAdmin?: boolean;
  onRemoveVideo?: (dayId: string, videoId: string) => void;
}

export default function WeekDetail({ week, isAdmin = false, onRemoveVideo }: WeekDetailProps) {
  // TUTARSIZLIK KONTROLÜ: Başlık ve tarihler arasındaki farkı kontrol et
  console.log('📋 WeekDetail - Hafta Bilgileri:', {
    id: week.id,
    title: week.title,
    startDate: week.startDate,
    endDate: week.endDate,
    status: week.status,
    dayCount: week.days.length
  });

  return (
    <div className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">{week.title}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span
              className={`text-sm px-3 py-1 rounded-full w-fit ${
                week.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {week.status === 'published' ? 'Yayında' : 'Taslak'}
            </span>
            <span className="text-sm text-gray-500">
              {(() => {
                const startDate = week?.startDate;
                const endDate = week?.endDate;
                
                // Tarih geçerlilik kontrolü
                const isValidDate = (dateStr: string | undefined): boolean => {
                  if (!dateStr || dateStr === '') return false;
                  const date = new Date(dateStr + 'T00:00:00Z');
                  return !isNaN(date.getTime());
                };
                
                const safeStartDate = isValidDate(startDate) 
                  ? new Date(startDate! + 'T00:00:00Z')
                  : new Date();
                const safeEndDate = isValidDate(endDate)
                  ? new Date(endDate! + 'T00:00:00Z')
                  : new Date();
                
                const formattedRange = `${safeStartDate.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })} - ${safeEndDate.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long'
                })}`;
                
                // TUTARSIZLIK UYARISI
                if (week.title && startDate && endDate) {
                  const titleHasDate = /(\d+)\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)/i.test(week.title);
                  if (titleHasDate) {
                    const titleDatesMatch = week.title.includes(safeStartDate.getDate().toString());
                    if (!titleDatesMatch) {
                      console.warn('⚠️ TUTARSIZLIK:', {
                        hafta: week.title,
                        baslikTarihleri: week.title.match(/\d+\s+\w+/g),
                        gercekTarihler: `${startDate} - ${endDate}`,
                        goruntulenenTarihler: formattedRange
                      });
                    }
                  }
                }
                
                return formattedRange;
              })()}
            </span>
          </div>
        </div>

        {week.days.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Bu hafta için gün eklenmedi</p>
          </div>
        ) : (
          <div className="space-y-6">
            {week.days.map((day) => (
              <DayContent
                key={day.id}
                day={day}
                isAdmin={isAdmin}
                onRemoveVideo={
                  isAdmin && onRemoveVideo ? (videoId) => onRemoveVideo(day.id, videoId) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
