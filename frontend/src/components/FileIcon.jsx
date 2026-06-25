import {
  FileImageOutlined, FileOutlined, FilePdfOutlined,
  FileWordOutlined, FileExcelOutlined, VideoCameraOutlined,
  FileZipOutlined, FilePptOutlined, FileTextOutlined,
} from '@ant-design/icons'

const MIME_ICON_MAP = [
  { prefix: 'image/',           Icon: FileImageOutlined,  color: '#1677ff' },
  { prefix: 'video/',           Icon: VideoCameraOutlined, color: '#722ed1' },
  { prefix: 'audio/',           Icon: FileTextOutlined,   color: '#13c2c2' },
  { includes: 'pdf',            Icon: FilePdfOutlined,    color: '#f5222d' },
  { includes: 'word',           Icon: FileWordOutlined,   color: '#1677ff' },
  { includes: 'excel',          Icon: FileExcelOutlined,  color: '#52c41a' },
  { includes: 'spreadsheet',    Icon: FileExcelOutlined,  color: '#52c41a' },
  { includes: 'powerpoint',     Icon: FilePptOutlined,    color: '#fa8c16' },
  { includes: 'presentation',   Icon: FilePptOutlined,    color: '#fa8c16' },
  { includes: 'zip',            Icon: FileZipOutlined,    color: '#fadb14' },
  { prefix: 'text/',            Icon: FileTextOutlined,   color: '#8c8c8c' },
]

export function resolveFileIcon(mimeType = '') {
  for (const rule of MIME_ICON_MAP) {
    if (rule.prefix   && mimeType.startsWith(rule.prefix))   return rule
    if (rule.includes && mimeType.includes(rule.includes))   return rule
  }
  return { Icon: FileOutlined, color: '#8c8c8c' }
}

export default function FileIcon({ mimeType, size = 32, style }) {
  const { Icon, color } = resolveFileIcon(mimeType)
  return <Icon style={{ fontSize: size, color, ...style }} />
}