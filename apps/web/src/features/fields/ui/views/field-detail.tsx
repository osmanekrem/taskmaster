import {
    useParams,
} from "@tanstack/react-router";
import {Button} from "@/components/ui/button";
import {PencilIcon} from "lucide-react";
import useEditFieldModal from "@/features/fields/hooks/use-edit-field-modal";
import FieldTypeIcon from "@/features/fields/ui/components/field-type-icon";
import EditFieldModal from "@/features/fields/ui/components/edit-field-modal";
import DeleteFieldButton from "@/features/fields/ui/components/delete-field-button";
import {Route} from "@/routes/__protected/settings/fields/$id";

export default function FieldDetail() {
    const {id} = useParams({from: Route.id});
    const data = Route.useLoaderData()
    const {open} = useEditFieldModal();

    return (
        <div className="flex flex-col w-full h-full space-y-4">
            <EditFieldModal/>
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold leading-tight flex items-center gap-2 truncate">
                    <FieldTypeIcon name={data.fieldType?.icon ?? ""}/>
                    {data.name}
                </h2>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => open(id)}>
                        <PencilIcon className="size-4"/>
                        Düzenle
                    </Button>
                    <DeleteFieldButton id={id}/>
                </div>
            </div>
        </div>
    );
}
