import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage      from './pages/LoginPage'
import ProjectsPage   from './pages/ProjectsPage'
import FileBrowserPage from './pages/FileBrowserPage'
import AdminPage      from './pages/AdminPage'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout      from './components/AppLayout'
import GlobalStoragePage from './pages/GlobalStoragePage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/"                     element={<ProjectsPage />} />
          <Route path="/global"               element={<GlobalStoragePage />} />
          <Route path="/projects/:projectId"  element={<FileBrowserPage />} />
          <Route path="/admin"                element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}