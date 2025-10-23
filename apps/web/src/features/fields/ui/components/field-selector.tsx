import {Item, ItemActions, ItemContent, ItemMedia, ItemTitle} from "@/components/ui/item";
import {cn} from "@/lib/utils";
import {Icon} from "@/components/ui/icon-picker";
import type {IconName} from "lucide-react/dynamic";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {Button} from "@/components/ui/button";
import {useQuery} from "@tanstack/react-query";
import {getFieldsWithDetailsQuery} from "@/features/fields/lib/queries";

interface FieldSelectorProps {
    fields: any[];
    setFields: React.Dispatch<React.SetStateAction<any[]>>
}

export default function FieldSelector({
                                          fields,
                                          setFields
                                      }: FieldSelectorProps) {

    const {data} = useQuery(getFieldsWithDetailsQuery);
    return <div className="flex flex-col w-full space-y-2 h-full overflow-y-auto">
        {data?.data.map((field) => {
            const isSelected = fields.some((item) => item.id === field.id);
            return (
                <Item
                    key={field.id}
                    size="sm"
                    variant="outline"
                    className={cn(
                        isSelected ? "bg-primary/10" : "",
                        " select-none"
                    )}
                >
                    <ItemMedia>
                        <Icon className="size-4" name={field.icon as IconName}/>
                    </ItemMedia>
                    <ItemContent>
                        <ItemTitle>{field.name}</ItemTitle>
                    </ItemContent>
                    <ItemActions>
                        <Tooltip>
                            <TooltipTrigger>
                                <Icon className="size-4" name={"info"}/>
                            </TooltipTrigger>
                            <TooltipContent className="p-4">
                                {field.description || "Açıklama yok"}
                                {field.options.map((option => {
                                    const isStaticSelect = option.key === "is-dynamic-options" && option.value === "false"
                                    return (
                                        <div key={option.id} className="mt-2">
                                            <strong>{option.name}:</strong> {option.type === "boolean" ? (option.value === "true" ? "Evet" : "Hayır") : option.value}
                                            {isStaticSelect && field.selectOptions.length ? (
                                                <div className="mt-1">
                                                    <strong>Seçenekler:</strong>
                                                    <ul className="list-disc list-inside">
                                                        {field.selectOptions.map((selectOption: any) => (
                                                            <li key={selectOption.id}
                                                                className="flex items-center gap-2">
                                                                <Icon name={selectOption.icon}
                                                                      className="size-3.5"/>
                                                                {selectOption.name}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : null}
                                        </div>
                                    )
                                }))}
                            </TooltipContent>
                        </Tooltip>
                        {isSelected ? (
                            <Button
                                variant="ghost"
                                className="p-1.5"
                                onClick={() => {
                                    setFields((prevFields) =>
                                        prevFields.filter((item) => item.id !== field.id)
                                    );
                                }}
                            >
                                <Icon className="size-4" name={"minus"}/>
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                className="p-1.5"
                                onClick={() => {

                                    setFields((prevFields) => [
                                        ...prevFields,
                                        field,
                                    ]);
                                }}
                            >
                                <Icon className="size-4" name={"plus"}/>
                            </Button>
                        )}
                    </ItemActions>
                </Item>
            )
        })}
    </div>;
}