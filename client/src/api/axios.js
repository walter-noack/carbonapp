import axios from 'axios'

export const AMBIENTAPP_LOGIN_URL = 'https://ambientapp.cl/login'

// Sin token propio: la sesión viaja en la cookie ambient_token compartida
// con AmbientApp (withCredentials la adjunta en cada request cross-origin).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = error.response.data?.loginUrl || AMBIENTAPP_LOGIN_URL
    }
    return Promise.reject(error)
  }
)

export default api
