import { createFileRoute, redirect } from '@tanstack/react-router'
import { Outlet, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    // const user = await context.fetchUser()
    // if (!user) throw redirect({ to: '/login' })
  },
  component: AuthenticatedLayout
})

function AuthenticatedLayout() {
  // Funzione per il download del PDF dalla cartella public/
  const handleDownloadPDF = () => {
    // ✅ MODIFICA QUI: sostituisci con il nome esatto del tuo file PDF
    const pdfUrl = '/guida.pdf'; // Es: '/contratto.pdf', '/documenti/manuale.pdf'

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'guida.pdf'; // Nome del file al download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Barra di navigazione - Stile uniforme */}
      <nav className="bg-white shadow-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo quadrato sinistra */}
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" aria-label="Logo spazio riservato">
              {/* Spazio per logo quadrato */}
            </div>

            {/* Menu Links (centro) */}
            <ul className="flex space-x-6 mx-auto">
              <li>
                <Link
                  to="/patients"
                  className="px-6 py-3 bg-gradient-to-r from-[#0c5baa] to-[#0a4a8a] text-white font-semibold rounded-xl shadow-lg hover:from-[#0a4a8a] hover:to-[#08407a] focus:ring-4 focus:ring-[#0c5baa]/20 transition-all duration-200"
                >
                  Pazienti
                </Link>
              </li>
              <li>
                <Link
                  to="/visits"
                  className="px-6 py-3 bg-gradient-to-r from-[#48b671] to-[#3da861] text-white font-semibold rounded-xl shadow-lg hover:from-[#3da861] hover:to-[#329c51] focus:ring-4 focus:ring-[#48b671]/20 transition-all duration-200"
                >
                  Visite
                </Link>
              </li>
              <li>
                <Link
                  to="/documents"
                  className="px-6 py-3 bg-gradient-to-r from-[#9e427a] to-[#8e3a6a] text-white font-semibold rounded-xl shadow-lg hover:from-[#8e3a6a] hover:to-[#7e325a] focus:ring-4 focus:ring-[#9e427a]/20 transition-all duration-200"
                >
                  Documenti
                </Link>
              </li>
            </ul>

            {/* Logo (destra) + Pulsante Info PDF (sinistra del logo) */}
            <div className="flex items-center space-x-4">
              {/* Pulsante Info PDF - Icona "i" di informazione */}
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-600 hover:to-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all duration-200 text-sm"
                aria-label="Scarica documento PDF"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Info
              </button>

              {/* Logo Virtual Factory */}
              <a
                href="https://www.virtualfactory.it/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 hover:scale-105 transition-transform duration-200"
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
        </div>
      </nav>

      {/* Contenuto delle pagine - SOLO immagine background */}
      <div className="min-h-screen pt-4 relative">
        <div
          className="fixed inset-0 bg-[url('/medical-bg.png')] bg-cover bg-center bg-no-repeat z-0 opacity-10"
        />
        <div className="relative z-10 min-h-screen">
          <Outlet />
        </div>
      </div>
    </>

  )
}
