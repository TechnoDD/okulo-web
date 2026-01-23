import { account } from '@/utils/appwrite'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'
import { Outlet, Link, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/_authed')({
  // beforeLoad: async ({ location }) => {
  //   try {
  //     const user = await account.get()
  //     if (!user) {
  //       throw redirect({
  //         to: '/login',
  //         search: { redirect: location.href },
  //       })
  //     }
  //     return { user }
  //   }
  //   catch (error) {
  //     // Re-throw redirects (they're intentional, not errors)
  //     if (isRedirect(error)) throw error

  //     // Auth check failed (network error, etc.) - redirect to login
  //     throw redirect({
  //       to: '/login',
  //       search: { redirect: location.href },
  //     })
  //   }

  // },
  loader: ({ location, context }) => {
    // const user = useQuery({
    //   queryKey: ['user'], queryFn: () => {

    //   }
    // })
  },
  component: AuthenticatedLayout
})

function AuthenticatedLayout() {

  return (
    <>
      {/* La tua navbar qui */}
      {/* Barra di navigazione - Stile uniforme */}
      <nav className="bg-white shadow-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <ul className="flex space-x-6">
              <li>
                <Link
                  to="/patients"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200"
                  activeOptions={{ exact: true }}
                >
                  Pazienti
                </Link>
              </li>
              <li>
                <Link
                  to="/visits"
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:from-emerald-600 hover:to-emerald-700 focus:ring-4 focus:ring-emerald-200 transition-all duration-200"
                  activeOptions={{ exact: true }}
                >
                  Visite
                </Link>
              </li>
              <li>
                <Link
                  to="/documents"
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-purple-600 hover:to-purple-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200"
                  activeOptions={{ exact: true }}
                >
                  Documenti
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Contenuto delle pagine */}
      <Outlet />
    </>
  )
}