import { createFileRoute, redirect } from '@tanstack/react-router'
import { Outlet, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    try {
      const { getUser } = context.authentication;
      const user = await getUser();
      return { user }
    } catch (err) {
      throw redirect({ to: "/login" });
    }
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
          <div className="flex justify-between items-center h-16">
            {/* Menu Links (centro) */}
            <ul className="flex space-x-6 mx-auto">
              <li>
                <Link
                  to="/patients"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200"
                >
                  Pazienti
                </Link>
              </li>
              <li>
                <Link
                  to="/visits"
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:from-emerald-600 hover:to-emerald-700 focus:ring-4 focus:ring-emerald-200 transition-all duration-200"
                >
                  Visite
                </Link>
              </li>
              <li>
                <Link
                  to="/documents"
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-purple-600 hover:to-purple-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200"
                >
                  Documenti
                </Link>
              </li>
            </ul>

            {/* Logo (destra) - Link esterno con TanStack Router */}
            <a
              href="https://www.virtualfactory.it/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 hover:scale-105 transition-transform duration-200"
              onClick={(e) => {
                // TanStack Router gestisce automaticamente i link esterni
                // con target="_blank" senza interferire
              }}
              aria-label="Virtual Factory - Sito principale (nuova finestra)"
            >
              <img
                src="/VFLogo.png"
                alt="Virtual Factory Logo"
                className="h-10 w-auto object-contain"
              />
            </a>
          </div>
        </div>
      </nav>
      {/* Contenuto delle pagine */}
      <Outlet />
    </>
  )
}