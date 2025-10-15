import {createFileRoute, redirect} from '@tanstack/react-router'

export const Route = createFileRoute('/__protected/settings/')({
    beforeLoad: () => {
        throw redirect({to: '/settings/profile'})
    }
})