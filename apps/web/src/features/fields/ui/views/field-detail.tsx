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
import TypeFormElement from "@/components/type-form-element";
import {useEffect, useState} from "react";

export default function FieldDetail() {
    const {id} = useParams({from: Route.id});
    const data = Route.useLoaderData()
    const {open} = useEditFieldModal();

    const [optionsData, setOptionsData] = useState(data?.options || []);
    const [isUpdated, setIsUpdated] = useState(false);

    const onChangeOption = (optionId: string, newValue: any) => {
        setOptionsData(prevOptions =>
            prevOptions.map(option =>
                option.id === optionId ? {...option, value: newValue} : option
            )
        );
    };

    useEffect(() => {
        setOptionsData(data?.options || []);
        setIsUpdated(false);
    }, [data]);

    useEffect(() => {
        if (JSON.stringify(optionsData.map(
            option => ({
                ...option,
                value: typeof option.value === "string" ? option.value : JSON.stringify(option.value)
            })
        )) !== JSON.stringify(data?.options)) {
            setIsUpdated(true);
        } else {
            setIsUpdated(false);
        }
    }, [optionsData]);

    return (
        <div className="flex flex-col w-full h-full space-y-4">
            <EditFieldModal/>
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold leading-tight flex items-center gap-2 truncate">
                    <FieldTypeIcon name={data?.icon ?? ""}/>
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
            {data?.description && (
                <p className="text-sm text-muted-foreground">
                    {data.description}
                </p>
            )}
            {optionsData.map(option => (
                <div key={option.id} className="p-4 border rounded-md flex items-center justify-between">
                    <TypeFormElement {...option}
                                     value={option.value}
                                     onChange={(value: any) => onChangeOption(option.id, value)}/>
                </div>
            ))}

            {isUpdated && (
                <p className="text-sm text-warning">
                    Dikkat: Alan seçeneklerinde değişiklik yaptınız, ancak bu değişiklikler kaydedilmedi.
                </p>
            )}
        </div>
    );
}
