import client from './client'

export const getProjects = (includeInactive = false) =>
  client.get('projects', {
    params: includeInactive ? { include_inactive: true } : {}
  })
export const getProject    = (id)          => client.get(`projects/${id}`)
export const createProject = (data)        => client.post('projects', data)
export const updateProject = (id, data)    => client.patch(`projects/${id}`, data)

export const getMembers    = (pid)         => client.get(`projects/${pid}/members`)
export const addMember     = (pid, data)   => client.post(`projects/${pid}/members`, data)
export const removeMember  = (pid, uid)    => client.delete(`projects/${pid}/members/${uid}`)