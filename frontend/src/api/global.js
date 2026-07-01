import client from './client'

export const getGlobalStructure  = ()                  => client.get('global/structure')

export const listGlobalFiles = (subdirectory = null) => {
  const params = {}
  if (subdirectory !== null) params.subdirectory = subdirectory
  return client.get('global/files', { params })
}

export const checkGlobalConflict = (data)              => client.post('global/files/check-conflict', data)

export const deleteGlobalFile    = (fileId)            => client.delete(`global/files/${fileId}`)

export const createGlobalDirectory = (name)            => client.post('global/directories', { name })

export const uploadGlobalFile = (formData, onProgress) =>
  client.post('global/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })

export const downloadGlobalFile = async (fileId, filename) => {
  const res = await client.get(`global/files/${fileId}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export const fetchGlobalThumbnail = (fileId) =>
  client.get(`global/files/${fileId}/thumbnail`, { responseType: 'blob' })

export const fetchGlobalFileBlob = (fileId, onProgress) =>
  client.get(`global/files/${fileId}/download`, {
    responseType: 'blob',
    onDownloadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })

