import { useState, useRef } from 'react'
import { Image, X, Upload } from 'lucide-react'
import { useImageUpload } from '../../hooks/useImageUpload'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
}

export function ImageUpload({ images, onImagesChange, maxImages = 4 }: ImageUploadProps) {
  const { uploadImages, deleteImage, uploading, error } = useImageUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Check max images limit
    if (images.length + files.length > maxImages) {
      alert(`Максимум ${maxImages} изображений`)
      return
    }

    try {
      const urls = await uploadImages(files)
      onImagesChange([...images, ...urls])
    } catch (err) {
      console.error('Upload error:', err)
      alert(error || 'Ошибка загрузки изображений')
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = images[index]
    try {
      await deleteImage(imageToRemove)
      const newImages = images.filter((_, i) => i !== index)
      onImagesChange(newImages)
    } catch (err) {
      console.error('Delete error:', err)
      alert('Ошибка удаления изображения')
    }
  }

  return (
    <div className="space-y-3">
      {/* Image preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-white/10"
              />
              <button
                onClick={() => handleRemoveImage(index)}
                className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={uploading}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-2 px-4 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Загрузка...
              </>
            ) : (
              <>
                <Upload size={16} />
                Добавить изображения ({images.length}/{maxImages})
              </>
            )}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Help text */}
      <div className="text-white/40 text-xs">
        Форматы: JPG, PNG, GIF. Макс. размер: 5MB. Максимум {maxImages} изображений.
      </div>
    </div>
  )
}
