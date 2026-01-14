import { Week } from '../types';
import { Calendar, Circle, CheckCircle2, X } from 'lucide-react';

interface SidebarProps {
  weeks: Week[];
  selectedWeekId: string | null;
  onSelectWeek: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ weeks, selectedWeekId, onSelectWeek, isOpen = true, onClose }: SidebarProps) {
  const handleSelectWeek = (id: string) => {
    onSelectWeek(id);
    // Mobilde hafta seçildiğinde sidebar'ı kapat
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobil Overlay/Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static
          top-0 left-0
          w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Haftalık Güncellemeler</h1>
            <p className="text-sm text-gray-500 mt-1">Video içerik merkezi</p>
          </div>
          {/* Mobilde kapatma butonu */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Menüyü kapat"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

      <div className="p-4">
        {weeks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Henüz hafta yok</p>
        ) : (
          weeks.map((week) => (
            <button
              key={week.id}
              onClick={() => handleSelectWeek(week.id)}
              className={`w-full text-left p-4 rounded-lg mb-2 transition-all ${
                selectedWeekId === week.id
                  ? 'bg-blue-50 border-2 border-[#0078d4]'
                  : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 text-sm">{week.title}</h3>
                {week.status === 'published' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 ml-2" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                )}
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(week.startDate + 'T00:00:00Z').toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short'
                })} - {new Date(week.endDate + 'T00:00:00Z').toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short'
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    week.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {week.status === 'published' ? 'Yayında' : 'Taslak'}
                </span>
                <span className="text-xs text-gray-400">{week.days.length} gün</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
