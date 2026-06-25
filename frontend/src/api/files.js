import client from './client'

export const getStructure = (pid) =>
  client.get(`projects/${pid}/structure`)

export const listFiles = (pid, directoryType, date = null) =>
  client.get(`projects/${pid}/files`, {
    params: { directory_type: directoryType, ...(date && { date }) }
  })

export const checkConflict = (pid, data) =>
  client.post(`projects/${pid}/files/check-conflict`, data)

export const uploadFile = (pid, formData, onProgress) =>
  client.post(`projects/${pid}/files/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })

// Returns blob — triggers browser download
export const downloadFile = async (pid, fileId, filename) => {
  const res = await client.get(`projects/${pid}/files/${fileId}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(res.data)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Returns blob for authenticated image display
export const fetchThumbnail = (pid, fileId) =>
  client.get(`projects/${pid}/files/${fileId}/thumbnail`, { responseType: 'blob' })

export const deleteFile = (pid, fileId) =>
  client.delete(`projects/${pid}/files/${fileId}`)