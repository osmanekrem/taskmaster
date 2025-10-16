import {createFileRoute} from '@tanstack/react-router'
import Fields from "@/features/fields/ui/views/fields";

export const Route = createFileRoute('/__protected/settings/fields')({
    component: Fields,
})
