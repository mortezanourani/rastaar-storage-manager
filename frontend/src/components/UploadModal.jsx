import { useState } from 'react'
import {
  Modal, Steps, Upload, Button, Input,
  Select, Progress, Alert, Typography, message, Space,
} from 'antd'
import { InboxOutlined, WarningOutlined, UploadOutlined } from '@ant-design/icons'
import { checkConflict, uploadFile } from '../api/files'
import { getMembers } from '../api/projects'

const { Dragger } = Upload
const { Text }    = Typography

const STEP_LABELS = ['Pick file', 'Name & mentions', 'Uploading']

export default function UploadModal({
  projectId, directoryType, dateDirectory,
  subdirectory = '',
  open, onClose, onSuccess,
}) {
  const [step,        setStep]        = useState(0)
  const [file,        setFile]        = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [overwrite,   setOverwrite]   = useState(false)
  const [conflict,    setConflict]    = useState(false)
  const [members,     setMembers]     = useState([])
  const [mentions,    setMentions]    = useState([])
  const [progress,    setProgress]    = useState(0)
  const [checking,    setChecking]    = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [error,       setError]       = useState('')

  const reset = () => {
    setStep(0); setFile(null); setDisplayName(''); setOverwrite(false)
    setConflict(false); setMentions([]); setProgress(0)
    setChecking(false); setUploading(false); setError('')
  }

  const handleClose = () => { reset(); onClose() }

  // Step 0 → 1: file chosen
  const handlePick = async (picked) => {
    setFile(picked)
    setDisplayName(picked.name)
    try {
      const res = await getMembers(projectId)
      setMembers(res.data)
    } catch {}
    setStep(1)
    return false  // stop Ant Design's own upload
  }

  // Step 1: check conflict then upload
  const handleNext = async () => {
    const name = displayName.trim()
    if (!name) { setError('File name is required'); return }
    setError('')
    setChecking(true)

    try {
      const res = await checkConflict(projectId, {
        directory_type: directoryType,
        date_directory: dateDirectory || null,
        filename:       name,
      })

      if (res.data.conflict && !overwrite) {
        setConflict(true)
        setChecking(false)
        return
      }
    } catch {
      setError('Could not check for conflicts. Please try again.')
      setChecking(false)
      return
    }

    setChecking(false)
    handleUpload(name)
  }

  const handleUpload = async (name) => {
    setStep(2)
    setUploading(true)
    setProgress(0)

    const form = new FormData()
    form.append('file',           file)
    form.append('display_name',   name || displayName.trim())
    form.append('directory_type', directoryType)
    if (dateDirectory) form.append('date_directory', dateDirectory)
    form.append('overwrite',      overwrite ? 'true' : 'false')
    if (subdirectory) form.append('subdirectory', subdirectory)
    if (mentions.length) form.append('mention_user_ids', mentions.join(','))

    try {
      await uploadFile(projectId, form, setProgress)
      setProgress(100)
      message.success(`"${displayName.trim()}" uploaded`)
      onSuccess()
      setTimeout(handleClose, 700)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
      setUploading(false)
      setStep(1)
    }
  }

  const suggestRename = () => {
    const dot = displayName.lastIndexOf('.')
    const renamed = dot > -1
      ? displayName.slice(0, dot) + '_copy' + displayName.slice(dot)
      : displayName + '_copy'
    setDisplayName(renamed)
    setConflict(false)
    setOverwrite(false)
  }

  return (
    <Modal
      title="Upload File"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Steps
        current={step}
        size="small"
        style={{ marginBottom: 28 }}
        items={STEP_LABELS.map((t) => ({ title: t }))}
      />

      {/* ── Step 0: Pick file ── */}
      {step === 0 && (
        <Dragger
          beforeUpload={handlePick}
          showUploadList={false}
          style={{ borderRadius: 8 }}
        >
          <p style={{ fontSize: 36, margin: '12px 0 8px' }}>📂</p>
          <Text strong style={{ fontSize: 15, display: 'block' }}>
            Click or drag a file here
          </Text>
          <Text type="secondary" style={{ display: 'block', marginTop: 4, marginBottom: 12 }}>
            Images, videos, documents — up to 1 GB
          </Text>
        </Dragger>
      )}

      {/* ── Step 1: Name + conflict + mentions ── */}
      {step === 1 && (
        <div>
          {/* Conflict warning */}
          {conflict && !overwrite && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={`"${displayName}" already exists in this folder`}
              description={
                <Space style={{ marginTop: 8 }}>
                  <Button
                    danger size="small"
                    onClick={() => { setOverwrite(true); setConflict(false) }}
                  >
                    Overwrite existing file
                  </Button>
                  <Button size="small" onClick={suggestRename}>
                    Rename (add _copy)
                  </Button>
                </Space>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {/* File name */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>File Name</Text>
            <Input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                setConflict(false)
                setOverwrite(false)
              }}
              placeholder="Enter file name including extension"
              autoFocus
            />
            {overwrite && (
              <Text type="warning" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                ⚠️ This will overwrite the existing file
              </Text>
            )}
          </div>

          {/* Mentions */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Mention Members{' '}
              <Text type="secondary" style={{ fontWeight: 400 }}>(optional)</Text>
            </Text>
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Select team members to notify"
              value={mentions}
              onChange={setMentions}
              optionFilterProp="label"
              options={members.map((m) => ({
                value: m.user_id,
                label: m.full_name || m.email,
              }))}
            />
          </div>

          {/* Selected file info */}
          <div style={{
            background: '#f5f6fa', borderRadius: 8,
            padding: '10px 14px', marginBottom: 16,
            fontSize: 12, color: '#666',
          }}>
            📎 {file?.name} &nbsp;·&nbsp; {(file?.size / 1024 / 1024).toFixed(2)} MB
          </div>

          {error && (
            <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setStep(0); setConflict(false); setOverwrite(false) }}>
              Back
            </Button>
            <Button
              type="primary"
              onClick={handleNext}
              loading={checking}
              icon={<UploadOutlined />}
            >
              {checking ? 'Checking...' : 'Upload'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Progress ── */}
      {step === 2 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Progress
            type="circle"
            percent={progress}
            status={uploading && progress < 100 ? 'active' : progress === 100 ? 'success' : 'exception'}
            style={{ marginBottom: 20 }}
          />
          <Text strong style={{ display: 'block', fontSize: 15 }}>
            {progress < 100 ? 'Uploading...' : '✓ Upload complete'}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {displayName}
          </Text>
          {error && (
            <Alert
              type="error" message={error} showIcon
              style={{ marginTop: 16, textAlign: 'left' }}
            />
          )}
        </div>
      )}
    </Modal>
  )
}
