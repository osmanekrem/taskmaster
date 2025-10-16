import {createFileRoute} from '@tanstack/react-router'
import Fields from "@/features/fields/ui/views/fields";
import NotFound from "@/components/not-found";

export const Route = createFileRoute('/__protected/settings/fields')({
    component: Fields,
    notFoundComponent: () => <NotFound/>,
})
