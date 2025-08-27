'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@apollo/client'
import { 
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { UPLOAD_ASSESSMENT_DOCUMENT, DELETE_ASSESSMENT_DOCUMENT } from '@/lib/graphql/queries'

interface DocumentUploaderProps {
  operatorId: string
  documentIds: string[]
  onDocumentsChange: (documentIds: string[]) => void
  assessmentId?: string // If provided, documents will be uploaded immediately
}

interface UploadingDocument {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  error?: string
  uploadedDocumentId?: string
}

interface UploadedDocument {
  id: string
  filename: string
  size: number
  uploadedAt: string
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_TOTAL_SIZE = 1024 * 1024 * 1024 // 1GB total
const ACCEPTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif']
}

export function DocumentUploader({
  operatorId,
  documentIds,
  onDocumentsChange,
  assessmentId
}: DocumentUploaderProps) {
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDocument[]>([])
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([])
  
  const [uploadDocument] = useMutation(UPLOAD_ASSESSMENT_DOCUMENT, {
    context: {
      fetchOptions: {
        onUploadProgress: (progressEvent: any) => {
          const { loaded, total } = progressEvent
          const progress = Math.round((loaded / total) * 100)
          // Update progress for the current upload
          setUploadingDocs(prev => prev.map(doc => 
            doc.status === 'uploading' ? { ...doc, progress } : doc
          ))
        }
      }
    }
  })

  const [deleteDocument] = useMutation(DELETE_ASSESSMENT_DOCUMENT)

  const getTotalSize = () => {
    const uploadingSize = uploadingDocs.reduce((sum, doc) => sum + doc.file.size, 0)
    const uploadedSize = uploadedDocs.reduce((sum, doc) => sum + doc.size, 0)
    return uploadingSize + uploadedSize
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      case 'xls':
      case 'xlsx':
        return '📊'
      case 'ppt':
      case 'pptx':
        return '📈'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️'
      case 'txt':
        return '📃'
      case 'csv':
        return '📋'
      default:
        return '📎'
    }
  }

  const handleUpload = useCallback(async (files: File[]) => {
    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" is too large. Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}.`)
        continue
      }

      // Check total size limit
      if (getTotalSize() + file.size > MAX_TOTAL_SIZE) {
        alert(`Adding "${file.name}" would exceed the total size limit of ${formatFileSize(MAX_TOTAL_SIZE)}.`)
        continue
      }

      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Add to uploading list
      setUploadingDocs(prev => [...prev, {
        id: uploadId,
        file,
        progress: 0,
        status: 'uploading'
      }])

      try {
        if (assessmentId) {
          // Upload immediately if assessment ID is provided
          const result = await uploadDocument({
            variables: {
              assessmentId,
              file,
              metadata: {
                description: `Uploaded for assessment analysis`,
                category: 'ASSESSMENT_DOCUMENT'
              }
            }
          })

          const uploadedDoc = result.data.uploadAssessmentDocument
          
          // Move from uploading to uploaded
          setUploadingDocs(prev => prev.filter(doc => doc.id !== uploadId))
          setUploadedDocs(prev => [...prev, uploadedDoc])
          onDocumentsChange([...documentIds, uploadedDoc.id])
        } else {
          // Store for later upload when assessment is created
          setUploadingDocs(prev => prev.map(doc => 
            doc.id === uploadId 
              ? { ...doc, progress: 100, status: 'completed' }
              : doc
          ))
        }
      } catch (error) {
        console.error('Upload failed:', error)
        setUploadingDocs(prev => prev.map(doc => 
          doc.id === uploadId 
            ? { ...doc, status: 'failed', error: 'Upload failed' }
            : doc
        ))
      }
    }
  }, [assessmentId, documentIds, onDocumentsChange, uploadDocument])

  const handleDelete = async (docId: string, isUploaded: boolean = false) => {
    if (isUploaded) {
      try {
        await deleteDocument({ variables: { id: docId } })
        setUploadedDocs(prev => prev.filter(doc => doc.id !== docId))
        onDocumentsChange(documentIds.filter(id => id !== docId))
      } catch (error) {
        console.error('Delete failed:', error)
      }
    } else {
      setUploadingDocs(prev => prev.filter(doc => doc.id !== docId))
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: ACCEPTED_FORMATS,
    maxSize: MAX_FILE_SIZE,
    multiple: true
  })

  const totalFiles = uploadingDocs.length + uploadedDocs.length
  const completedFiles = uploadedDocs.length + uploadingDocs.filter(doc => doc.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card
        {...getRootProps()}
        className={`p-8 border-2 border-dashed cursor-pointer transition-all text-center ${
          isDragActive 
            ? 'border-blue-400 bg-blue-500/10' 
            : 'border-gray-600 hover:border-blue-500 hover:bg-blue-500/5'
        }`}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">
          {isDragActive ? 'Drop files here' : 'Upload Documents'}
        </h3>
        <p className="text-gray-400 mb-4">
          Drag and drop files here, or click to select files
        </p>
        
        {/* File Format Info */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>Supported formats: PDF, Word, Excel, PowerPoint, Images, Text, CSV</p>
          <p>Maximum file size: {formatFileSize(MAX_FILE_SIZE)}</p>
          <p>Total limit: {formatFileSize(MAX_TOTAL_SIZE)}</p>
        </div>
      </Card>

      {/* Upload Progress Summary */}
      {totalFiles > 0 && (
        <Card className="p-4 bg-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">
              Upload Progress ({completedFiles}/{totalFiles})
            </span>
            <span className="text-gray-400 text-sm">
              {formatFileSize(getTotalSize())} / {formatFileSize(MAX_TOTAL_SIZE)}
            </span>
          </div>
          <Progress 
            value={(completedFiles / totalFiles) * 100} 
            className="h-2 mb-2"
          />
          <Progress 
            value={(getTotalSize() / MAX_TOTAL_SIZE) * 100} 
            className="h-1"
          />
        </Card>
      )}

      {/* File List */}
      <div className="space-y-3">
        <AnimatePresence>
          {/* Uploading Files */}
          {uploadingDocs.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {getFileIcon(doc.file.name)}
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium truncate max-w-xs">
                        {doc.file.name}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={`text-xs ${
                            doc.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            doc.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {doc.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(doc.id)}
                          className="p-1 w-6 h-6"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{formatFileSize(doc.file.size)}</span>
                      {doc.status === 'uploading' && (
                        <span>{doc.progress}%</span>
                      )}
                    </div>
                    
                    {(doc.status === 'uploading' || doc.status === 'processing') && (
                      <Progress value={doc.progress} className="h-1 mt-2" />
                    )}
                    
                    {doc.error && (
                      <div className="text-red-400 text-sm mt-2 flex items-center space-x-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        <span>{doc.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Uploaded Files */}
          {uploadedDocs.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-4 bg-green-500/5 border-green-500/20">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {getFileIcon(doc.filename)}
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium truncate max-w-xs">
                        {doc.filename}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={`text-xs ${
                            doc.processingStatus === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                            doc.processingStatus === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {doc.processingStatus.toLowerCase()}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="p-1 w-6 h-6"
                        >
                          <EyeIcon className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(doc.id, true)}
                          className="p-1 w-6 h-6 text-red-400 hover:text-red-300"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {totalFiles === 0 && (
        <div className="text-center py-8">
          <DocumentTextIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            No documents uploaded. Document analysis is optional but can provide 
            deeper insights into your operational maturity.
          </p>
        </div>
      )}
    </div>
  )
}