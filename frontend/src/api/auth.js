import client from './client'

export const login  = (email, password) => client.post('auth/login', { email, password })
export const logout = ()               => client.post('auth/logout')
export const getMe  = ()               => client.get('users/me')

// User management (admin only)
export const getUsers    = ()              => client.get('users')
export const createUser  = (data)          => client.post('users', data)
export const updateUser  = (id, data)      => client.patch(`users/${id}`, data)
export const deactivate  = (id)            => client.delete(`users/${id}`)