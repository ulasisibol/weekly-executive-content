import { Week, Day, Video } from './types';

const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const getDateString = (date: Date): string => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const getDayOfWeek = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00Z');
  return dayNames[date.getUTCDay()];
};

let mockWeeks: Week[] = [
  {
    id: '1',
    title: '1. Hafta - 12-18 Ocak',
    startDate: '2026-01-12',
    endDate: '2026-01-18',
    status: 'published',
    days: [
      {
        id: 'd1-1',
        date: '2026-01-12',
        dayOfWeek: 'Pazartesi',
        videos: [
          {
            id: 'v1-1',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            type: 'story'
          },
          {
            id: 'v1-2',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            type: 'post'
          }
        ]
      },
      {
        id: 'd1-2',
        date: '2026-01-13',
        dayOfWeek: 'Salı',
        videos: [
          {
            id: 'v1-3',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
            type: 'story'
          }
        ]
      }
    ]
  },
  {
    id: '2',
    title: '2. Hafta - 19-25 Ocak',
    startDate: '2026-01-19',
    endDate: '2026-01-25',
    status: 'published',
    days: [
      {
        id: 'd2-1',
        date: '2026-01-19',
        dayOfWeek: 'Pazartesi',
        videos: [
          {
            id: 'v2-1',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
            type: 'story'
          },
          {
            id: 'v2-2',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            type: 'post'
          }
        ]
      }
    ]
  },
  {
    id: '3',
    title: '3. Hafta - 26 Ocak - 1 Şubat',
    startDate: '2026-01-26',
    endDate: '2026-02-01',
    status: 'published',
    days: [
      {
        id: 'd3-1',
        date: '2026-01-26',
        dayOfWeek: 'Pazartesi',
        videos: [
          {
            id: 'v3-1',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            type: 'story'
          },
          {
            id: 'v3-2',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            type: 'story'
          },
          {
            id: 'v3-3',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
            type: 'post',
            description: 'Bu haftanın ilk gönderisi! Yeni içeriklerimizle karşınızdayız.'
          }
        ]
      }
    ]
  }
];

export const getWeeks = (): Week[] => {
  // Otomatik olarak bir sonraki haftayı oluştur (sadece gerektiğinde)
  // ensureNextWeekExists() sadece otomatik oluşturma için, manuel oluşturma için değil
  // ensureNextWeekExists();
  
  return [...mockWeeks].sort((a, b) =>
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
};

export const getWeekById = (id: string): Week | undefined => {
  return mockWeeks.find(week => week.id === id);
};

export const saveWeek = (week: Week): void => {
  const index = mockWeeks.findIndex(w => w.id === week.id);
  if (index !== -1) {
    mockWeeks[index] = week;
  } else {
    mockWeeks.push(week);
  }
};

export const removeWeek = (weekId: string): boolean => {
  const index = mockWeeks.findIndex(w => w.id === weekId);
  if (index === -1) return false;
  
  mockWeeks.splice(index, 1);
  return true;
};

export const addDayToWeek = (weekId: string, afterDateString: string): Day | null => {
  const week = mockWeeks.find(w => w.id === weekId);
  if (!week) return null;

  let nextDate: Date;
  
  if (week.days.length === 0) {
    // Hafta boşsa, haftanın başlangıç tarihini kullan
    nextDate = new Date(week.startDate + 'T00:00:00Z');
  } else {
    // Mevcut günlerin tarihlerini al ve en son tarihi bul
    const existingDates = week.days.map(d => new Date(d.date + 'T00:00:00Z').getTime()).sort((a, b) => b - a);
    const lastDate = new Date(existingDates[0]);
    
    // Son tarihten 1 gün sonrasını ekle
    nextDate = new Date(lastDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  }

  const newDateString = getDateString(nextDate);

  // Hafta bitiş tarihini kontrol et
  if (new Date(newDateString + 'T00:00:00Z') > new Date(week.endDate + 'T00:00:00Z')) {
    return null;
  }

  const newDay: Day = {
    id: `d${weekId}-${Date.now()}`,
    date: newDateString,
    dayOfWeek: getDayOfWeek(newDateString),
    videos: []
  };

  // Tarih sırasına göre ekle
  const insertIndex = week.days.findIndex(d => new Date(d.date + 'T00:00:00Z').getTime() > new Date(newDateString + 'T00:00:00Z').getTime());
  if (insertIndex === -1) {
    week.days.push(newDay);
  } else {
    week.days.splice(insertIndex, 0, newDay);
  }

  return newDay;
};

export const removeDayFromWeek = (weekId: string, dayId: string): boolean => {
  const week = mockWeeks.find(w => w.id === weekId);
  if (!week) return false;

  const index = week.days.findIndex(d => d.id === dayId);
  if (index === -1) return false;

  week.days.splice(index, 1);
  return true;
};

export const updateDayDate = (weekId: string, dayId: string, newDateString: string): boolean => {
  const week = mockWeeks.find(w => w.id === weekId);
  if (!week) return false;

  const day = week.days.find(d => d.id === dayId);
  if (!day) return false;

  const newDate = new Date(newDateString + 'T00:00:00Z');
  const weekStart = new Date(week.startDate + 'T00:00:00Z');
  const weekEnd = new Date(week.endDate + 'T00:00:00Z');

  if (newDate < weekStart || newDate > weekEnd) {
    return false;
  }

  day.date = newDateString;
  day.dayOfWeek = getDayOfWeek(newDateString);

  week.days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return true;
};

export const addVideoToDay = (weekId: string, dayId: string, video: Omit<Video, 'id'>): Video | null => {
  const week = mockWeeks.find(w => w.id === weekId);
  if (!week) return null;

  const day = week.days.find(d => d.id === dayId);
  if (!day) return null;

  const newVideo: Video = {
    ...video,
    id: `v${Date.now()}`
  };

  day.videos.push(newVideo);
  return newVideo;
};

export const removeVideoFromDay = (weekId: string, dayId: string, videoId: string): boolean => {
  const week = mockWeeks.find(w => w.id === weekId);
  if (!week) return false;

  const day = week.days.find(d => d.id === dayId);
  if (!day) return false;

  const index = day.videos.findIndex(v => v.id === videoId);
  if (index === -1) return false;

  day.videos.splice(index, 1);
  return true;
};

export const updateVideoUrl = (weekId: string, dayId: string, videoId: string, newUrl: string): boolean => {
  const week = mockWeeks.find(w => w.id === weekId);
  if (!week) return false;

  const day = week.days.find(d => d.id === dayId);
  if (!day) return false;

  const video = day.videos.find(v => v.id === videoId);
  if (!video) return false;

  video.url = newUrl;
  return true;
};

export const updateVideoDescription = (weekId: string, dayId: string, videoId: string, description: string): boolean => {
  const week = mockWeeks.find(w => w.id === weekId);
  if (!week) return false;

  const day = week.days.find(d => d.id === dayId);
  if (!day) return false;

  const video = day.videos.find(v => v.id === videoId);
  if (!video) return false;

  video.description = description;
  return true;
};

const getWeekStartDate = (date: Date): Date => {
  const dayOfWeek = date.getUTCDay(); // 0 = Pazar, 1 = Pazartesi, ..., 6 = Cumartesi
  const monday = new Date(date);
  
  // Pazartesi gününe git (Pazartesi = 1)
  // Eğer Pazar ise (0), 6 gün geri git
  // Eğer Pazartesi ise (1), 0 gün git
  // Eğer Salı ise (2), 1 gün geri git
  // ...
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setUTCDate(monday.getUTCDate() - daysToSubtract);
  monday.setUTCHours(0, 0, 0, 0);
  
  return monday;
};

const getWeekEndDate = (startDate: Date): Date => {
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  return endDate;
};

export const createWeek = (startDate?: string): Week => {
  let weekStart: Date;
  
  if (startDate) {
    // Kullanıcı tarih girdiyse, o tarihten itibaren pazartesiyi bul
    const inputDate = new Date(startDate + 'T00:00:00Z');
    weekStart = getWeekStartDate(inputDate);
  } else {
    // Son haftanın bitiş tarihinden sonraki pazartesi
    const lastWeek = mockWeeks.length > 0 
      ? mockWeeks.reduce((latest, week) => {
          const latestDate = new Date(latest.endDate + 'T00:00:00Z');
          const weekDate = new Date(week.endDate + 'T00:00:00Z');
          return weekDate > latestDate ? week : latest;
        })
      : null;
    
    if (lastWeek) {
      const lastEndDate = new Date(lastWeek.endDate + 'T00:00:00Z');
      weekStart = new Date(lastEndDate);
      weekStart.setUTCDate(weekStart.getUTCDate() + 1); // Sonraki gün
      weekStart = getWeekStartDate(weekStart);
    } else {
      // İlk hafta - bugünden itibaren pazartesi
      const today = new Date();
      weekStart = getWeekStartDate(today);
    }
  }

  const weekEnd = getWeekEndDate(weekStart);
  
  const startDateString = getDateString(weekStart);
  const endDateString = getDateString(weekEnd);
  
  // Hafta numarasını doğru hesapla - en yüksek hafta numarasını bul
  let weekNumber = 1;
  if (mockWeeks.length > 0) {
    const weekNumbers = mockWeeks.map(w => {
      const match = w.title.match(/^(\d+)\./);
      return match ? parseInt(match[1], 10) : 0;
    });
    weekNumber = Math.max(...weekNumbers, 0) + 1;
  }
  
  const startMonth = weekStart.toLocaleDateString('tr-TR', { month: 'long', day: 'numeric' });
  const endMonth = weekEnd.toLocaleDateString('tr-TR', { month: 'long', day: 'numeric' });
  
  const newWeek: Week = {
    id: `week-${Date.now()}`,
    title: `${weekNumber}. Hafta - ${startMonth} - ${endMonth}`,
    startDate: startDateString,
    endDate: endDateString,
    status: 'draft',
    days: []
  };

  mockWeeks.push(newWeek);
  return newWeek;
};

/**
 * Video yükleme fonksiyonu (Mock)
 * Şu an blob URL oluşturuyor, ileride Microsoft Graph API ile SharePoint'e yüklenecek
 * @param file - Yüklenecek video dosyası
 * @returns Promise<string> - Video URL'si
 */
export const uploadVideo = async (file: File): Promise<string> => {
  // Mock upload: 2 saniye bekle ve blob URL oluştur
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Tarayıcıda geçici blob URL oluştur
  // İleride bu kısım Microsoft Graph API ile SharePoint'e yükleme yapacak
  const blobUrl = URL.createObjectURL(file);
  
  return blobUrl;
};

export const ensureNextWeekExists = (): Week | null => {
  // Son haftanın bitiş tarihini kontrol et
  const lastWeek = mockWeeks.length > 0 
    ? mockWeeks.reduce((latest, week) => {
        const latestDate = new Date(latest.endDate + 'T00:00:00Z');
        const weekDate = new Date(week.endDate + 'T00:00:00Z');
        return weekDate > latestDate ? week : latest;
      })
    : null;

  if (!lastWeek) {
    // Hiç hafta yoksa, bugünden itibaren hafta oluştur
    return createWeek();
  }

  const lastEndDate = new Date(lastWeek.endDate + 'T00:00:00Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  // Son haftanın bitişinden 3 gün öncesinden itibaren yeni hafta oluştur
  const checkDate = new Date(lastEndDate);
  checkDate.setUTCDate(checkDate.getUTCDate() - 3);
  
  if (today >= checkDate) {
    // Son haftanın bitişinden sonraki pazartesi
    let nextMonday = new Date(lastEndDate);
    nextMonday.setUTCDate(nextMonday.getUTCDate() + 1);
    nextMonday = getWeekStartDate(nextMonday);
    
    const nextMondayString = getDateString(nextMonday);
    
    // Bu hafta zaten var mı kontrol et
    const existingWeek = mockWeeks.find(w => w.startDate === nextMondayString);
    if (!existingWeek) {
      return createWeek(nextMondayString);
    }
  }

  return null;
};