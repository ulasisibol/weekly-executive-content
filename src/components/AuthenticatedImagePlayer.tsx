import { useState, useEffect, useRef } from 'react';
import { getFileContentAsBlob } from '../dataService';
import { Loader2, Image as ImageIcon } from 'lucide-react';

interface AuthenticatedImagePlayerProps {
  url: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  onError?: (error: Error) => void;
}

// Basit bir blob cache mekanizması
const blobCache = new Map<string, string>();

export default function AuthenticatedImagePlayer({
  url,
  className = '',
  style,
  alt = 'Görsel',
  onError
}: AuthenticatedImagePlayerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const extractFileName = (imageUrl: string): string | null => {
    try {
      const urlObj = new URL(imageUrl);
      const pathParts = urlObj.pathname.split('/');
      const videosIndex = pathParts.findIndex(part => part.toLowerCase() === 'videos');
      if (videosIndex !== -1 && videosIndex < pathParts.length - 1) {
        return decodeURIComponent(pathParts[videosIndex + 1]);
      }
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        return decodeURIComponent(lastPart);
      }
      const match = imageUrl.match(/[^/]+\.(jpg|jpeg|png|webp|gif)$/i);
      if (match) {
        return decodeURIComponent(match[0]);
      }
      return null;
    } catch (e) {
      console.error('Dosya adı çıkarılamadı:', e);
      return null;
    }
  };

  useEffect(() => {
    const cleanup = () => {
      // Blob URL'i cache'te tut, sadece component unmount olduğunda temizle
      // Cache'teki blob URL'ler sayfa yenilenene kadar kalacak
    };

    if (!url || url.trim() === '') {
      setError('Görsel URL bulunamadı');
      setLoading(false);
      return cleanup;
    }

    const isSharePointUrl = url.includes('sharepoint.com') || url.includes('sharepoint');
    if (!isSharePointUrl) {
      console.log('SharePoint URL değil, direkt kullanılıyor:', url);
      setBlobUrl(url);
      setLoading(false);
      return cleanup;
    }

    const fileName = extractFileName(url);
    if (!fileName) {
      const errorMsg = 'Dosya adı URL\'den çıkarılamadı';
      console.error('❌', errorMsg, url);
      setError(errorMsg);
      setLoading(false);
      if (onError) {
        onError(new Error(errorMsg));
      }
      return cleanup;
    }

    // Intersection Observer ile lazy loading
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('🖼️ Görsel görünür hale geldi, yükleme başlatılıyor:', fileName);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Görsel yükleme fonksiyonu
    const loadImage = async () => {
      if (blobCache.has(fileName)) {
        const cachedBlobUrl = blobCache.get(fileName)!;
        setBlobUrl(cachedBlobUrl);
        setLoading(false);
        console.log('⚡ Görsel cache\'ten alındı (hızlı yükleme):', fileName);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('📥 SharePoint\'ten görsel indiriliyor:', fileName);
        const blob = await getFileContentAsBlob(fileName);
        const objectUrl = URL.createObjectURL(blob);
        
        blobCache.set(fileName, objectUrl);
        setBlobUrl(objectUrl);
        setLoading(false);
        
        console.log('✅ Görsel blob URL oluşturuldu ve cache\'e kaydedildi:', objectUrl);
      } catch (err: any) {
        const errorMsg = err?.message || 'Görsel yüklenemedi';
        console.error('❌ Görsel yükleme hatası:', err);
        setError(errorMsg);
        setLoading(false);
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMsg));
        }
      }
    };

    if (isVisible) {
      loadImage();
    }

    return cleanup;
  }, [url, onError, extractFileName, isVisible, blobUrl]);

  // Loading durumu
  if (loading && isVisible) {
    return (
      <div 
        ref={containerRef}
        className={`bg-gray-900 flex items-center justify-center ${className}`}
        style={style}
      >
        <div className="text-white text-sm flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span>Yükleniyor...</span>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error || !blobUrl) {
    return (
      <div 
        ref={containerRef}
        className={`bg-gray-800 flex items-center justify-center ${className}`}
        style={style}
      >
        <div className="text-white text-sm text-center px-4">
          {error || 'Görsel yüklenemedi'}
        </div>
      </div>
    );
  }

  // Görsel henüz görünür değilse placeholder göster
  if (!isVisible && !blobUrl) {
    return (
      <div 
        ref={containerRef}
        className={`bg-gray-900 flex items-center justify-center ${className}`}
        style={style}
      >
        <ImageIcon className="w-10 h-10 text-gray-400" />
      </div>
    );
  }

  // Görsel
  return (
    <div ref={containerRef} className="w-full h-full">
      <img
        src={blobUrl}
        alt={alt}
        className={className}
        style={style}
        onError={(e) => {
          console.error('Görsel oynatma hatası:', e);
          const errorMsg = 'Görsel gösterilemedi';
          setError(errorMsg);
          if (onError) {
            onError(new Error(errorMsg));
          }
        }}
      />
    </div>
  );
}
