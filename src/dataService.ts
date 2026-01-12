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
  }
];

export const getWeeks = (): Week[] => {
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

export const addDayToWeek = (weekId: string, afterDateString: string): Day | null => {
  const week = mockWeeks.find(w => w.id === weekId);
  if (!week) return null;

  const afterDate = new Date(afterDateString + 'T00:00:00Z');
  const nextDate = new Date(afterDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const newDateString = getDateString(nextDate);

  if (new Date(newDateString + 'T00:00:00Z') > new Date(week.endDate + 'T00:00:00Z')) {
    return null;
  }

  const newDay: Day = {
    id: `d${weekId}-${Date.now()}`,
    date: newDateString,
    dayOfWeek: getDayOfWeek(newDateString),
    videos: []
  };

  const insertIndex = week.days.findIndex(d => new Date(d.date) > new Date(newDateString));
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
