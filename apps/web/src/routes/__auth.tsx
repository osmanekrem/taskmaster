import {createFileRoute, Outlet, redirect} from '@tanstack/react-router'

export const Route = createFileRoute('/__auth')({
    component: RouteComponent,
    beforeLoad: async ({context}) => {
        if (context.userSession) {
            throw redirect({to: '/dashboard'})
        }
    }
})

function RouteComponent() {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 h-full">
            <div className="px-2.5 xl:px-10 py-6 h-full w-full">
                <div className="mx-auto w-full h-full max-w-md p-6 flex flex-col justify-center items-center gap-6">
                    <Outlet/>
                </div>
            </div>
            <div className="max-xl:hidden h-full">
                <img className="w-full h-full object-cover"
                     src="https://media.istockphoto.com/id/936117884/photo/thats-it-im-done.jpg?s=612x612&w=0&k=20&c=KrSsacQQ1_3u1-E9jE9dPWHnA4419AFo88ZQFqVrJ5w="
                     alt="banner" fetchPriority="high"/>
            </div>
        </div>
    )
}
