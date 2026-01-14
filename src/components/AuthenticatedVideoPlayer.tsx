import { useState, useEffect, useRef } from 'react';
import { getFileContentAsBlob } from '../dataService';

interface AuthenticatedVideoPlayerProps {
  url: string;
  className?: string;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  style?: React.CSSProperties;
  onError?: (error: Error) => void;
}

/**
 * AuthenticatedVideoPlayer - SharePoint video URL'lerini kimlik doğrulamalı olarak oynatır
 * 
 * Bu bileşen, SharePoint'ten gelen video URL'lerini (401 Unauthorized hatası vermemesi için)
 * kimlik doğrulamalı blob URL'e dönüştürerek oynatır.
 * 
 * Kullanım:
 * <AuthenticatedVideoPlayer 
 *   url="https://tenant.sharepoint.com/sites/site/Shared%20Documents/videos/file.mp4"
 *   controls
 *   className="w-full h-full"
 * />
 */
export default function AuthenticatedVideoPlayer({
  url,
  className = '',
  controls = true,
  preload = 'metadata',
  style,
  onError
}: AuthenticatedVideoPlayerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // URL'den dosya adını ayıkla
    // Örnek: "https://tenant.sharepoint.com/sites/site/Shared%20Documents/videos/1768377426498_wnll26_Cuma.mp4"
    // -> "1768377426498_wnll26_Cuma.mp4"
    const extractFileName = (url: string): string | null => {
      try {
        // URL'den path'i al
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        
        // "videos" klasöründen sonraki dosya adını bul
        const videosIndex = pathParts.findIndex(part => part.toLowerCase() === 'videos');
        if (videosIndex !== -1 && videosIndex < pathParts.length - 1) {
          // videos klasöründen sonraki kısım dosya adı
          return decodeURIComponent(pathParts[videosIndex + 1]);
        }
        
        // Eğer "videos" bulunamazsa, path'in son kısmını al
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          return decodeURIComponent(lastPart);
        }
        
        // URL'den direkt dosya adını çıkarmaya çalış
        const match = url.match(/[^/]+\.(mp4|mov|avi|webm|mkv)$/i);
        if (match) {
          return decodeURIComponent(match[0]);
        }
        
        return null;
      } catch (e) {
        console.error('Dosya adı çıkarılamadı:', e);
        return null;
      }
    };

    // Blob URL'i temizle (memory leak önleme)
    const cleanup = () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
    };

    // URL geçerli mi kontrol et
    if (!url || url.trim() === '') {
      setError('Video URL bulunamadı');
      setLoading(false);
      return;
    }

    // SharePoint URL'i mi kontrol et
    const isSharePointUrl = url.includes('sharepoint.com') || url.includes('sharepoint');
    if (!isSharePointUrl) {
      // SharePoint URL'i değilse, direkt kullan (örn: blob: veya http://)
      console.log('SharePoint URL değil, direkt kullanılıyor:', url);
      setBlobUrl(url);
      setLoading(false);
      return;
    }

    // SharePoint URL'inden dosya adını çıkar
    const fileName = extractFileName(url);
    if (!fileName) {
      const errorMsg = 'Dosya adı URL\'den çıkarılamadı';
      console.error('❌', errorMsg, url);
      setError(errorMsg);
      setLoading(false);
      if (onError) {
        onError(new Error(errorMsg));
      }
      return;
    }

    console.log('🎬 Video oynatıcı başlatılıyor:', { url, fileName });

    // Blob'u al ve URL oluştur
    const loadVideo = async () => {
      try {
        setLoading(true);
        setError(null);

        // SharePoint'ten dosya içeriğini blob olarak getir
        const blob = await getFileContentAsBlob(fileName);
        
        // Blob'u yerel URL'e çevir
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setLoading(false);
        
        console.log('✅ Video blob URL oluşturuldu:', objectUrl);
      } catch (err: any) {
        const errorMsg = err?.message || 'Video yüklenemedi';
        console.error('❌ Video yükleme hatası:', err);
        setError(errorMsg);
        setLoading(false);
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMsg));
        }
      }
    };

    loadVideo();

    // Cleanup: Component unmount olduğunda blob URL'i temizle
    return cleanup;
  }, [url, onError]);

  // Loading durumu
  if (loading) {
    return (
      <div 
        className={`bg-gray-900 flex items-center justify-center ${className}`}
        style={style}
      >
        <div className="text-white text-sm">Video yükleniyor...</div>
      </div>
    );
  }

  // Hata durumu
  if (error || !blobUrl) {
    return (
      <div 
        className={`bg-gray-800 flex items-center justify-center ${className}`}
        style={style}
      >
        <div className="text-white text-sm text-center px-4">
          {error || 'Video yüklenemedi'}
        </div>
      </div>
    );
  }

  // Video oynatıcı
  return (
    <video
      ref={videoRef}
      src={blobUrl}
      controls={controls}
      preload={preload}
      className={className}
      style={style}
      onError={(e) => {
        console.error('Video oynatma hatası:', e);
        const errorMsg = 'Video oynatılamadı';
        setError(errorMsg);
        if (onError) {
          onError(new Error(errorMsg));
        }
      }}
    >
      Tarayıcınız video etiketini desteklemiyor.
    </video>
  );
}
