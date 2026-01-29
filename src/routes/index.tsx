import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    component: RedirectToPatients,
})

function RedirectToPatients() {
    return <Navigate to='/patients'></Navigate>
}
