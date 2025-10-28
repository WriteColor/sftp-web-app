export interface SFTPConfig {
  host: string
  port: number
  username: string
  password: string
}

export interface FileMetadata {
  id?: string
  filename: string
  original_filename: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_at?: string
  created_at?: string
}

export interface UploadResponse {
  success: boolean
  message: string
  files?: FileMetadata[]
  errors?: string[]
}

export interface UploadBatch {
  id?: string
  name: string
  created_at?: string
  file_count?: number
}

export interface FileMetadataWithStatus extends FileMetadata {
  status?: "uploaded" | "pending"
}
