import { account } from '@/utils/appwrite'
import { createFileRoute, redirect, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'



export const Route = createFileRoute('/login')({
  // beforeLoad: async ({ search }) => {
  //   const auth = await checkAuth()

  //   // ✅ Già loggato → redirect alla pagina richiesta o dashboard
  //   if (auth?.user) {
  //     const redirectTo = search.redirect || '/'
  //     throw redirect({ to: redirectTo })
  //   }
  // },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' })

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      account.createEmailPasswordSession(formData)

      const redirectTo = search.redirect || '/patients/'
      navigate({ to: redirectTo })
    } catch (err: any) {
      setError(err.message || 'Login fallito')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Accedi
          </h1>
          <p className="text-xl text-gray-600">Inserisci le tue credenziali</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-100 border border-red-200 rounded-xl">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            {search.redirect && (
              <div className="p-3 bg-blue-100 border border-blue-200 rounded-xl text-sm text-blue-800 mb-6">
                🔄 Destinazione: {search.redirect}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required

                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required

                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"

              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
            >
              Accedi al Sistema
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
