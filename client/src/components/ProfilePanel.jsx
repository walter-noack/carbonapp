import { useState } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

function PasswordInput({ value, onChange, required = true }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required={required}
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

export default function ProfilePanel({ onClose }) {
  const { user, updateUser, logout } = useAuth()
  const [tab, setTab] = useState('perfil')

  // Perfil
  const [name, setName] = useState(user?.name || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null) // { type: 'ok'|'error', text }

  // Contraseña
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const { data } = await api.patch('/auth/me', { name })
      updateUser({ name: data.name })
      setProfileMsg({ type: 'ok', text: 'Nombre actualizado correctamente' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Error al guardar' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSavePw = async (e) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) {
      return setPwMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden' })
    }
    setPwSaving(true)
    setPwMsg(null)
    try {
      await api.patch('/auth/me/password', { currentPassword: pw.current, newPassword: pw.next })
      setPwMsg({ type: 'ok', text: 'Contraseña actualizada correctamente' })
      setPw({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.message || 'Error al cambiar contraseña' })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {[{ id: 'perfil', label: 'Perfil' }, { id: 'password', label: 'Contraseña' }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm font-medium py-3 mr-5 border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Perfil */}
        {tab === 'perfil' && (
          <form onSubmit={handleSaveProfile} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">El correo no puede modificarse.</p>
            </div>
            {profileMsg && (
              <p className={`text-sm rounded-lg px-3 py-2 ${
                profileMsg.type === 'ok'
                  ? 'text-green-700 bg-green-50 border border-green-200'
                  : 'text-red-600 bg-red-50 border border-red-200'
              }`}>{profileMsg.text}</p>
            )}
            <button
              type="submit"
              disabled={profileSaving || name === user?.name}
              className="w-full bg-[#0068ec] hover:bg-[#005acc] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {profileSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        )}

        {/* Contraseña */}
        {tab === 'password' && (
          <form onSubmit={handleSavePw} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
              <PasswordInput value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <PasswordInput value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
              <PasswordInput value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
            </div>
            {pwMsg && (
              <p className={`text-sm rounded-lg px-3 py-2 ${
                pwMsg.type === 'ok'
                  ? 'text-green-700 bg-green-50 border border-green-200'
                  : 'text-red-600 bg-red-50 border border-red-200'
              }`}>{pwMsg.text}</p>
            )}
            <button
              type="submit"
              disabled={pwSaving}
              className="w-full bg-[#0068ec] hover:bg-[#005acc] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {pwSaving ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => { logout(); onClose() }}
            className="text-xs text-gray-400 hover:text-red-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
