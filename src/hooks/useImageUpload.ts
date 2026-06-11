import { useState } from 'react'
import { supabase } from '../app/utils/supabase'

export function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadImages = async (files: File[]): Promise<string[]> => {
    setUploading(true)
    setError(null)

    try {
      const uploadPromises = files.map(async (file) => {
        // Validate file
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`)
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error(`File ${file.name} is too large (max 5MB)`)
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `posts/${fileName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath)

        return publicUrl
      })

      const urls = await Promise.all(uploadPromises)
      return urls
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Failed to upload images'
      setError(error)
      throw new Error(error)
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (url: string): Promise<void> => {
    try {
      // Extract file path from URL
      const urlParts = url.split('/post-images/')
      if (urlParts.length !== 2) return

      const filePath = `post-images/${urlParts[1]}`

      const { error } = await supabase.storage
        .from('post-images')
        .remove([filePath])

      if (error) throw error
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Failed to delete image'
      setError(error)
      throw new Error(error)
    }
  }

  return {
    uploadImages,
    deleteImage,
    uploading,
    error
  }
}
