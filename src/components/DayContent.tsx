import { Day } from '../types';
import { Video, Trash2 } from 'lucide-react';

interface DayContentProps {
  day: Day;
  isAdmin?: boolean;
  onRemoveVideo?: (videoId: string) => void;
}

export default function DayContent({ day, isAdmin = false, onRemoveVideo }: DayContentProps) {
  const stories = day.videos.filter(v => v.type === 'story');
  const posts = day.videos.filter(v => v.type === 'post');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{day.dayOfWeek}</h3>
        <p className="text-sm text-gray-500">
          {/* GÖREV 3: Defensive Coding - Tarih formatlarken güvenli kontrol */}
          {(() => {
            const dateStr = day?.date;
            if (!dateStr || dateStr === '') {
              return 'Tarih belirtilmedi';
            }
            try {
              const date = new Date(dateStr + 'T00:00:00Z');
              if (isNaN(date.getTime())) {
                return 'Geçersiz tarih';
              }
              return date.toLocaleDateString('tr-TR', {
                month: 'short',
                day: 'numeric'
              });
            } catch (e) {
              return 'Tarih hatası';
            }
          })()}
        </p>
      </div>

      {(stories.length > 0 || posts.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stories.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Video className="w-4 h-4 text-[#0078d4]" />
                Hikaye
              </h4>
              <div className="space-y-3">
                {stories.map((story) => (
                  <div key={story.id} className="relative group flex justify-center items-center" style={{ aspectRatio: '4/5' }}>
                    <div
                      className="relative bg-gray-900 rounded-lg overflow-hidden h-full"
                      style={{ 
                        width: '56.25%', // 9/16 = 0.5625 = 56.25%
                        aspectRatio: '9/16'
                      }}
                    >
                      {/* GÖREV 3: Defensive Coding - Video URL kontrolü */}
                      {story?.url ? (
                        <video
                          src={story.url}
                          controls
                          className="w-full h-full object-contain"
                          preload="metadata"
                          onError={(e) => {
                            console.error('Video yükleme hatası:', story.url);
                            (e.target as HTMLVideoElement).style.display = 'none';
                          }}
                        >
                          Tarayıcınız video etiketini desteklemiyor.
                        </video>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm">
                          Video URL bulunamadı
                        </div>
                      )}
                    </div>
                    {isAdmin && onRemoveVideo && (
                      <button
                        onClick={() => onRemoveVideo(story.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {posts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Video className="w-4 h-4 text-[#0078d4]" />
                Post
              </h4>
              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="relative group">
                    <div className="flex flex-col gap-4">
                      <div
                        className="relative bg-gray-900 rounded-lg overflow-hidden"
                        style={{ aspectRatio: '4/5' }}
                      >
                        {/* GÖREV 3: Defensive Coding - Video URL kontrolü */}
                        {post?.url ? (
                          <video
                            src={post.url}
                            controls
                            className="w-full h-full object-cover"
                            preload="metadata"
                            onError={(e) => {
                              console.error('Video yükleme hatası:', post.url);
                              (e.target as HTMLVideoElement).style.display = 'none';
                            }}
                          >
                            Tarayıcınız video etiketini desteklemiyor.
                          </video>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm">
                            Video URL bulunamadı
                          </div>
                        )}
                        {isAdmin && onRemoveVideo && (
                          <button
                            onClick={() => onRemoveVideo(post.id)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Gönderi Açıklaması
                        </label>
                        <div className="bg-gray-50 rounded-lg p-3 min-h-[100px]">
                          {/* GÖREV 3: Defensive Coding - Optional chaining ve null coalescing */}
                          {post?.description?.trim() ? (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.description}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Açıklama eklenmedi</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">
          {isAdmin ? 'Video eklenmedi' : 'Bu gün için içerik yok'}
        </p>
      )}
    </div>
  );
}
