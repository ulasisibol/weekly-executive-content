import { useState } from 'react';
import { Week } from '../types';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import {
  saveWeek,
  addDayToWeek,
  removeDayFromWeek,
  updateDayDate,
  addVideoToDay,
  removeVideoFromDay,
  updateVideoUrl,
  updateVideoDescription,
  removeWeek
} from '../dataService';
import VideoDropzone from './VideoDropzone';

interface AdminEditProps {
  week: Week;
  onSave: () => void;
  onWeekDeleted?: () => void;
}

export default function AdminEdit({ week, onSave, onWeekDeleted }: AdminEditProps) {
  const [currentWeek, setCurrentWeek] = useState<Week>(week);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [activeDropzone, setActiveDropzone] = useState<{ dayId: string; type: 'story' | 'post' } | null>(null);
  const [editingDescription, setEditingDescription] = useState<{ dayId: string; videoId: string } | null>(null);
  const [descriptionValue, setDescriptionValue] = useState('');

  const handleAddDay = async (afterDateString?: string) => {
    try {
      // Eğer afterDateString verilmemişse, haftanın başlangıç tarihini kullan
      const dateToUse = afterDateString || currentWeek.startDate;
      const newDay = await addDayToWeek(currentWeek.id, dateToUse);
      if (newDay) {
        setCurrentWeek({ ...currentWeek, days: currentWeek.days });
        onSave();
      }
    } catch (error) {
      console.error('Gün eklenirken hata:', error);
      alert('Gün eklenirken bir hata oluştu.');
    }
  };

  const handleRemoveDay = async (dayId: string) => {
    try {
      const success = await removeDayFromWeek(currentWeek.id, dayId);
      if (success) {
        setCurrentWeek({
          ...currentWeek,
          days: currentWeek.days.filter(d => d.id !== dayId)
        });
        onSave();
      }
    } catch (error) {
      console.error('Gün silinirken hata:', error);
      alert('Gün silinirken bir hata oluştu.');
    }
  };

  const handleChangeDayDate = async (dayId: string, newDateString: string) => {
    try {
      // GÖREV 3: Defensive Coding - Tarih validasyonu
      if (!newDateString || newDateString.trim() === '') {
        alert('Geçerli bir tarih seçin');
        return;
      }
      
      const testDate = new Date(newDateString + 'T00:00:00Z');
      if (isNaN(testDate.getTime())) {
        alert('Geçersiz tarih formatı');
        return;
      }
      
      const success = await updateDayDate(currentWeek.id, dayId, newDateString);
      if (success) {
        const updated = { ...currentWeek };
        // Defensive Coding: Tarih sıralaması
        updated.days.sort((a, b) => {
          const dateA = a?.date ? new Date(a.date + 'T00:00:00Z').getTime() : 0;
          const dateB = b?.date ? new Date(b.date + 'T00:00:00Z').getTime() : 0;
          return dateA - dateB;
        });
        setCurrentWeek(updated);
        onSave();
      }
    } catch (error) {
      console.error('Gün tarihi güncellenirken hata:', error);
      alert('Gün tarihi güncellenirken bir hata oluştu.');
    }
  };

  const handleAddVideo = (dayId: string, type: 'story' | 'post') => {
    setActiveDropzone({ dayId, type });
  };

  const handleVideoUploaded = (dayId: string, type: 'story' | 'post') => async (url: string, description?: string) => {
    try {
      const video = await addVideoToDay(currentWeek.id, dayId, { url, type, description });
      if (video) {
        setCurrentWeek({ ...currentWeek });
        onSave();
        setActiveDropzone(null);
      }
    } catch (error) {
      console.error('Video eklenirken hata:', error);
      alert('Video eklenirken bir hata oluştu.');
    }
  };

  const handleCancelDropzone = () => {
    setActiveDropzone(null);
  };

  const handleRemoveVideo = async (dayId: string, videoId: string) => {
    try {
      const success = await removeVideoFromDay(currentWeek.id, dayId, videoId);
      if (success) {
        setCurrentWeek({ ...currentWeek });
        onSave();
      }
    } catch (error) {
      console.error('Video silinirken hata:', error);
      alert('Video silinirken bir hata oluştu.');
    }
  };

  const handleUpdateVideoUrl = async (dayId: string, videoId: string) => {
    const newUrl = prompt('Yeni video URL\'sini girin:');
    if (newUrl) {
      try {
        const success = await updateVideoUrl(currentWeek.id, dayId, videoId, newUrl);
        if (success) {
          setCurrentWeek({ ...currentWeek });
          onSave();
        }
      } catch (error) {
        console.error('Video URL güncellenirken hata:', error);
        alert('Video URL güncellenirken bir hata oluştu.');
      }
    }
  };

  const handleStartEditDescription = (dayId: string, videoId: string) => {
    const video = currentWeek.days
      .find(d => d.id === dayId)
      ?.videos.find(v => v.id === videoId);
    
    if (!video) return;
    
    setEditingDescription({ dayId, videoId });
    setDescriptionValue(video.description || '');
  };

  const handleSaveDescription = async (dayId: string, videoId: string) => {
    try {
      const success = await updateVideoDescription(currentWeek.id, dayId, videoId, descriptionValue);
      if (success) {
        setCurrentWeek({ ...currentWeek });
        onSave();
        setEditingDescription(null);
        setDescriptionValue('');
      }
    } catch (error) {
      console.error('Video açıklaması güncellenirken hata:', error);
      alert('Video açıklaması güncellenirken bir hata oluştu.');
    }
  };

  const handleCancelEditDescription = () => {
    setEditingDescription(null);
    setDescriptionValue('');
  };

  const handleWeekStatusChange = async (status: 'published' | 'draft') => {
    try {
      const updated = { ...currentWeek, status };
      await saveWeek(updated);
      setCurrentWeek(updated);
      onSave();
    } catch (error) {
      console.error('Hafta durumu güncellenirken hata:', error);
      alert('Hafta durumu güncellenirken bir hata oluştu.');
    }
  };

  const handleDeleteWeek = async () => {
    // Sadece boş haftalar silinebilir
    if (currentWeek.days.length > 0) {
      alert('Bu hafta silinemez çünkü içinde günler var. Önce tüm günleri silin.');
      return;
    }

    const confirmed = window.confirm(
      `"${currentWeek.title}" haftasını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
    );

    if (confirmed) {
      try {
        const success = await removeWeek(currentWeek.id);
        if (success) {
          onWeekDeleted?.();
        }
      } catch (error) {
        console.error('Hafta silinirken hata:', error);
        alert('Hafta silinirken bir hata oluştu.');
      }
    }
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
            {currentWeek.days.length === 0 && (
              <div className="flex items-end">
                <button
                  onClick={handleDeleteWeek}
                  className="w-full sm:w-auto px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Boş Haftayı Sil
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {currentWeek.days.map((day, index) => (
            <div key={day.id} className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                    {activeDropzone?.dayId === day.id ? (
                      <div className="space-y-3">
                        <VideoDropzone
                          type={activeDropzone.type}
                          onVideoUploaded={handleVideoUploaded(day.id, activeDropzone.type)}
                          onCancel={handleCancelDropzone}
                        />
                      </div>
                    ) : (
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
                    )}
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
                          {video.type === 'post' && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500 mb-1">Açıklama:</p>
                              {editingDescription?.dayId === day.id && editingDescription?.videoId === video.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={descriptionValue}
                                    onChange={(e) => setDescriptionValue(e.target.value)}
                                    placeholder="Gönderi açıklamasını girin..."
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#0078d4] focus:border-transparent resize-none"
                                    rows={3}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleSaveDescription(day.id, video.id)}
                                      className="text-xs px-2 py-1 bg-[#0078d4] text-white rounded hover:bg-[#106ebe] transition-colors"
                                    >
                                      Kaydet
                                    </button>
                                    <button
                                      onClick={handleCancelEditDescription}
                                      className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                    >
                                      İptal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-xs text-gray-700 bg-white p-2 rounded min-h-[40px]">
                                    {video.description || <span className="text-gray-400 italic">Açıklama yok</span>}
                                  </p>
                                  <button
                                    onClick={() => handleStartEditDescription(day.id, video.id)}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                  >
                                    Açıklama Düzenle
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateVideoUrl(day.id, video.id)}
                              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            >
                              URL Düzenle
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleAddDay(day.date)}
                className="w-full px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium border border-green-200"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Bu Günden Sonra Yeni Gün Ekle
              </button>
            </div>
          ))}
        </div>

        {currentWeek.days.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">Bu hafta için gün eklenmedi</p>
            <p className="text-xs text-gray-400 mb-6">Yönetici modunda günleri yönetebilirsiniz</p>
            <button
              onClick={() => handleAddDay()}
              className="px-6 py-3 bg-[#0078d4] text-white rounded-lg hover:bg-[#106ebe] transition-colors text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              İlk Günü Ekle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
