import {createFileRoute, notFound} from "@tanstack/react-router";
import NotFound from "@/components/not-found";
import {getFieldWithDetailsQuery} from "@/features/fields/lib/queries";
import FieldDetail from "@/features/fields/ui/views/field-detail";

export const Route = createFileRoute("/__protected/__admin/admin-settings/fields/$id")({
    component: FieldDetail,
    loader: async ({context, params}) => {
        const {id} = params;
        const {data} = await context.queryClient.fetchQuery(
            getFieldWithDetailsQuery(id ?? "")
        );
        if (!data) {
            throw notFound();
        }
        return data;
    },
    notFoundComponent: () => <NotFound/>,
});
