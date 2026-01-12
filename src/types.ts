export interface Video {
  id: string;
  url: string;
  type: 'story' | 'post';
  description?: string;
}

export interface Day {
  id: string;
  date: string;
  dayOfWeek: string;
  videos: Video[];
}

export interface Week {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'published' | 'draft';
  days: Day[];
}
