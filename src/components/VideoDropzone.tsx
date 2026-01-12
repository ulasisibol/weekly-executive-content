import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, X, Loader2 } from 'lucide-react';
import { uploadVideo } from '../dataService';

interface VideoDropzoneProps {
  type: 'story' | 'post';
  onVideoUploaded: (url: string, description?: string) => void;
  onCancel?: () => void;
}

export default function VideoDropzone({ type, onVideoUploaded, onCancel }: VideoDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Video dosyası kontrolü
    if (!file.type.startsWith('video/')) {
      alert('Lütfen geçerli bir video dosyası seçin.');
      return;
    }

    setSelectedFile(file);
    setUploading(true);
    setUploadProgress(0);

    // Önizleme için blob URL oluştur
    const previewBlobUrl = URL.createObjectURL(file);
    setPreviewUrl(previewBlobUrl);

    // Progress simülasyonu
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Mock upload
      const videoUrl = await uploadVideo(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Upload tamamlandı
      setUploading(false);
      setUploadedUrl(videoUrl);
      
      // Story için direkt kaydet, Post için açıklama alanı göster
      if (type === 'story') {
        onVideoUploaded(videoUrl);
        // Temizlik
        setTimeout(() => {
          setUploadProgress(0);
          setPreviewUrl(null);
          setUploadedUrl(null);
          setSelectedFile(null);
          if (previewBlobUrl) {
            URL.revokeObjectURL(previewBlobUrl);
          }
        }, 500);
      }
      // Post için previewUrl zaten set edilmiş, kullanıcı açıklama ekleyip kaydedecek
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Video yükleme hatası:', error);
      alert('Video yüklenirken bir hata oluştu.');
      setUploading(false);
      setUploadProgress(0);
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    }
  }, [type, onVideoUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (uploadedUrl && uploadedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedUrl);
    }
    setPreviewUrl(null);
    setUploadedUrl(null);
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(0);
    setDescription('');
    onCancel?.();
  };

  return (
    <div className="w-full">
      {!previewUrl && !uploading && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragActive 
              ? 'border-[#0078d4] bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-700 mb-2">
            {isDragActive 
              ? 'Dosyayı buraya bırakın' 
              : `${type === 'story' ? 'Hikaye' : 'Post'} video dosyasını sürükleyin veya tıklayın`
            }
          </p>
          <p className="text-xs text-gray-500">
            MP4, MOV, AVI, WEBM, MKV formatları desteklenir
          </p>
        </div>
      )}

      {uploading && (
        <div className="border-2 border-dashed border-[#0078d4] rounded-lg p-6 bg-blue-50">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-[#0078d4] animate-spin" />
          </div>
          <p className="text-sm font-medium text-gray-700 text-center mb-2">
            Video yükleniyor...
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-[#0078d4] h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">{uploadProgress}%</p>
        </div>
      )}

      {previewUrl && !uploading && (
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-white space-y-4">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0" style={{ width: '120px', aspectRatio: type === 'story' ? '9/16' : '4/5' }}>
              <video
                src={previewUrl}
                className="w-full h-full object-cover rounded-lg"
                controls={false}
                muted
              />
              <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
                <Video className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 mb-1">
                {selectedFile?.name || 'Video'}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB
              </p>
              <p className="text-xs text-green-600 font-medium">
                ✓ Video yüklendi
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {type === 'post' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gönderi Açıklaması (İsteğe Bağlı)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Gönderi açıklamasını buraya yazın..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0078d4] focus:border-transparent text-sm resize-none"
                rows={3}
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (uploadedUrl) {
                  onVideoUploaded(uploadedUrl, description || undefined);
                }
                handleCancel();
              }}
              className="flex-1 px-4 py-2 bg-[#0078d4] text-white rounded-lg hover:bg-[#106ebe] transition-colors text-sm font-medium"
            >
              Kaydet
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
