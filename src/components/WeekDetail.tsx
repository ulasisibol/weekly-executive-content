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
          {/* Sadece durum badge'i göster, başlık ve tarih tekrarını kaldır */}
          <div className="flex items-center gap-2">
            <span
              className={`text-sm px-3 py-1 rounded-full w-fit ${
                week.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {week.status === 'published' ? 'Yayında' : 'Taslak'}
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
