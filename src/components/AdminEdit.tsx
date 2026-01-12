import { useState } from 'react';
import { Week, Day } from '../types';
import { Save, Plus, Video, Trash2, ChevronDown } from 'lucide-react';
import {
  saveWeek,
  addDayToWeek,
  removeDayFromWeek,
  updateDayDate,
  addVideoToDay,
  removeVideoFromDay,
  updateVideoUrl
} from '../dataService';
import DayContent from './DayContent';

interface AdminEditProps {
  week: Week;
  onSave: () => void;
}

export default function AdminEdit({ week, onSave }: AdminEditProps) {
  const [currentWeek, setCurrentWeek] = useState<Week>(week);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);

  const handleAddDay = (afterDateString: string) => {
    const newDay = addDayToWeek(currentWeek.id, afterDateString);
    if (newDay) {
      setCurrentWeek({ ...currentWeek, days: currentWeek.days });
      onSave();
    }
  };

  const handleRemoveDay = (dayId: string) => {
    if (removeDayFromWeek(currentWeek.id, dayId)) {
      setCurrentWeek({
        ...currentWeek,
        days: currentWeek.days.filter(d => d.id !== dayId)
      });
      onSave();
    }
  };

  const handleChangeDayDate = (dayId: string, newDateString: string) => {
    if (updateDayDate(currentWeek.id, dayId, newDateString)) {
      const updated = { ...currentWeek };
      updated.days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setCurrentWeek(updated);
      onSave();
    }
  };

  const handleAddVideo = (dayId: string, type: 'story' | 'post') => {
    const url = prompt(`${type === 'story' ? 'Hikaye' : 'Post'} video URL'sini girin:`);
    if (url) {
      const video = addVideoToDay(currentWeek.id, dayId, { url, type });
      if (video) {
        setCurrentWeek({ ...currentWeek });
        onSave();
      }
    }
  };

  const handleRemoveVideo = (dayId: string, videoId: string) => {
    if (removeVideoFromDay(currentWeek.id, dayId, videoId)) {
      setCurrentWeek({ ...currentWeek });
      onSave();
    }
  };

  const handleUpdateVideoUrl = (dayId: string, videoId: string) => {
    const newUrl = prompt('Yeni video URL\'sini girin:');
    if (newUrl && updateVideoUrl(currentWeek.id, dayId, videoId, newUrl)) {
      setCurrentWeek({ ...currentWeek });
      onSave();
    }
  };

  const handleWeekStatusChange = (status: 'published' | 'draft') => {
    const updated = { ...currentWeek, status };
    saveWeek(updated);
    setCurrentWeek(updated);
    onSave();
  };

  const dayNumbers: { [key: string]: number } = {};
  currentWeek.days.forEach((day, index) => {
    dayNumbers[day.id] = index + 1;
  });

  const getDatesInRange = (startDate: string, endDate: string): string[] => {
    const dates = [];
    const current = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');

    while (current <= end) {
      const dateStr = new Date(current.getTime() - current.getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0];
      dates.push(dateStr);
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  };

  const availableDates = getDatesInRange(currentWeek.startDate, currentWeek.endDate);
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00Z');
    return dayNames[date.getUTCDay()];
  };

  return (
    <div className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{currentWeek.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(currentWeek.startDate + 'T00:00:00Z').toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })} - {new Date(currentWeek.endDate + 'T00:00:00Z').toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long'
              })}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
              <select
                value={currentWeek.status}
                onChange={(e) => handleWeekStatusChange(e.target.value as 'published' | 'draft')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0078d4] focus:border-transparent"
              >
                <option value="draft">Taslak</option>
                <option value="published">Yayında</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {currentWeek.days.map((day, index) => (
            <div key={day.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedDayId(expandedDayId === day.id ? null : day.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">
                    {index + 1}. Gün - {day.dayOfWeek}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(day.date + 'T00:00:00Z').toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {day.videos.length} video
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedDayId === day.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {expandedDayId === day.id && (
                <div className="border-t border-gray-200 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 mb-4 pb-4 border-b border-gray-200">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gün Tarihi
                      </label>
                      <select
                        value={day.date}
                        onChange={(e) => handleChangeDayDate(day.id, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0078d4] focus:border-transparent text-sm"
                      >
                        {availableDates.map((date) => (
                          <option key={date} value={date}>
                            {getDayOfWeek(date)} - {new Date(date + 'T00:00:00Z').toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 sm:flex-row items-end flex-col">
                      <button
                        onClick={() => handleRemoveDay(day.id)}
                        className="w-full sm:w-auto px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4 inline mr-1" />
                        Günü Sil
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddVideo(day.id, 'story')}
                        className="flex-1 px-3 py-2 bg-[#0078d4] text-white rounded-lg hover:bg-[#106ebe] transition-colors text-sm font-medium"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Hikaye Ekle
                      </button>
                      <button
                        onClick={() => handleAddVideo(day.id, 'post')}
                        className="flex-1 px-3 py-2 bg-[#0078d4] text-white rounded-lg hover:bg-[#106ebe] transition-colors text-sm font-medium"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Post Ekle
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {day.videos.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Video yok</p>
                    ) : (
                      day.videos.map((video) => (
                        <div key={video.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600 uppercase">
                              {video.type === 'story' ? 'Hikaye' : 'Post'}
                            </span>
                            <button
                              onClick={() => handleRemoveVideo(day.id, video.id)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 break-all mb-2 truncate">{video.url}</p>
                          <button
                            onClick={() => handleUpdateVideoUrl(day.id, video.id)}
                            className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            URL Düzenle
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {index < currentWeek.days.length - 1 && (
                    <button
                      onClick={() => handleAddDay(day.date)}
                      className="w-full mt-4 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Sonra Gün Ekle
                    </button>
                  )}

                  {index === currentWeek.days.length - 1 && (
                    <button
                      onClick={() => handleAddDay(day.date)}
                      className="w-full mt-4 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Yeni Gün Ekle
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {currentWeek.days.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">Bu hafta için gün eklenmedi</p>
            <p className="text-xs text-gray-400">Yönetici modunda günleri yönetebilirsiniz</p>
          </div>
        )}
      </div>
    </div>
  );
}
