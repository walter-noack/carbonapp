import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

function StatCard({ label, value, sub, to }) {
  const inner = (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-semibold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/organizations')]).then(
      ([usersRes, orgsRes]) => {
        const users = usersRes.data
        const orgs = orgsRes.data
        setStats({
          totalOrgs: orgs.length,
          activeOrgs: orgs.filter((o) => o.active).length,
          totalUsers: users.length,
          activeUsers: users.filter((u) => u.active).length,
          consultants: users.filter((u) => u.role === 'consultant' && u.active).length,
        })
      }
    )
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Panel</h2>
        <p className="text-sm text-gray-500 mt-0.5">Bienvenido, {user?.name}.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Organizaciones"
          value={stats?.totalOrgs}
          sub={`${stats?.activeOrgs ?? '—'} activas`}
          to="/admin/organizations"
        />
        <StatCard
          label="Usuarios"
          value={stats?.totalUsers}
          sub={`${stats?.activeUsers ?? '—'} activos`}
          to="/admin/users"
        />
        <StatCard
          label="Consultores activos"
          value={stats?.consultants}
          sub="con acceso a la plataforma"
        />
      </div>
    </div>
  )
}
