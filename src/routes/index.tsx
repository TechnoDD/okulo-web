import { useEffect } from 'react'
import { useNavigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    component: RedirectToPatients,
})

function RedirectToPatients() {
    const navigate = useNavigate()

    useEffect(() => {
        navigate({ to: '/patients', replace: true })
    }, [navigate])

    // Mostra un loader durante il redirect
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-lg text-gray-600">Ti stiamo reinderizzando ai pazienti...</p>
            </div>
        </div>
    )
}
