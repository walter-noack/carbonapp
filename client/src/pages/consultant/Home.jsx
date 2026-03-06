import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Inicio</h2>
        <p className="text-sm text-gray-500 mt-0.5">Bienvenido, {user?.name}.</p>
      </div>

      {user?.org ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-md">
          <p className="text-sm text-gray-500 mb-1">Tu organización</p>
          <p className="text-base font-medium text-gray-900">{user.org?.name || '—'}</p>
          <Link
            to="/dashboard/calculations"
            className="inline-block mt-4 text-sm text-blue-600 hover:underline font-medium"
          >
            Ver mis cálculos →
          </Link>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 max-w-md">
          <p className="text-sm font-medium text-amber-800">Sin organización asignada</p>
          <p className="text-sm text-amber-700 mt-1">
            Contacta al administrador para que te asigne a una organización.
          </p>
        </div>
      )}
    </div>
  )
}
