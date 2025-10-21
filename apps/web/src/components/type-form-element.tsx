import {Checkbox} from "@/components/ui/checkbox";
import {Label} from "@/components/ui/label";
import {Item, ItemActions, ItemContent, ItemMedia, ItemTitle} from "@/components/ui/item";
import {BadgeCheckIcon, ChevronRightIcon, PencilIcon, PlusIcon, SaveIcon, TrashIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useState} from "react";


const types = [
    {
        type: 'boolean',
        component: BooleanFormElement,
    },
    {
        type: 'select-options',
        component: SelectOptionsFormElement
    }
]

export default function TypeFormElement({type, ...props}: { type: string } & any) {
    const typeElement = types.find(t => t.type === type);
    if (!typeElement) return null;
    return <typeElement.component {...props} />
}

export interface BooleanFormElementProps {
    value: string;
    onChange: (value: boolean) => void;
    name: string;
    id: string;
}

export function BooleanFormElement({
                                       value,
                                       onChange,
                                       name,
                                       id,
                                   }: BooleanFormElementProps) {
    return (
        <div className="flex items-center gap-3">
            <Checkbox id={id} checked={JSON.parse(value)} onCheckedChange={onChange}/>
            <Label htmlFor={id}>{name}</Label>
        </div>
    );
}

export interface SelectOption {
    id: string;
    label: string;
    icon?: string;
}

export interface SelectOptionsFormElementProps {
    value: string;
    onChange: (value: SelectOption[] | string) => void;
    id: string;
}

export function SelectOptionsFormElement({
                                             value,
                                             onChange,
                                             id,
                                         }: SelectOptionsFormElementProps) {

    const validValue = typeof value === "string" ? JSON.parse(value) : value;
    const [isDynamicOptions, setIsDynamicOptions] = useState(false);
    const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);

    return (
        <div className="flex flex-col space-y-1 w-full">
            <div className="flex items-center gap-3 mb-2.5">
                <Checkbox id={id} checked={isDynamicOptions}
                          onCheckedChange={(value: boolean) => setIsDynamicOptions(value)}/>
                <Label htmlFor={id}>Dinamik</Label>
            </div>
            {validValue.map((option: SelectOption, index) => (
                <Item variant="outline" size="sm">
                    <ItemMedia>
                        <BadgeCheckIcon className="size-5"/>
                    </ItemMedia>
                    <ItemContent>
                        {editingOptionIndex === index ? (
                            <div className="flex flex-col space-y-2">
                                <input
                                    type="text"
                                    className="w-full border rounded-md px-2 py-1"
                                    value={option.label}
                                    onChange={(e) => {
                                        const newOptions = [...validValue];
                                        newOptions[index] = {
                                            ...newOptions[index],
                                            label: e.target.value,
                                        };
                                        onChange(newOptions);
                                    }}
                                />
                            </div>
                        ) : (

                            <ItemTitle>
                                {option.label}
                            </ItemTitle>
                        )}
                    </ItemContent>
                    <ItemActions>
                        {editingOptionIndex === index ? (
                            <Button
                                onClick={() => setEditingOptionIndex(null)}
                                variant="ghost"
                                className="p-1.5"
                                size="icon">
                                <SaveIcon className="size-3.5"/>
                            </Button>
                        ) : (
                            <>
                                <Button
                                    onClick={() => setEditingOptionIndex(index)}
                                    variant="ghost"
                                    className="p-1.5"
                                    size="icon">
                                    <PencilIcon className="size-3.5"/>
                                </Button>


                            </>
                        )}
                        <Button onClick={() => {
                            const newOptions = validValue.filter((_, i) => i !== index);
                            onChange(newOptions);
                        }}
                                variant="ghost"
                                className="p-1.5"
                                size="icon">
                            <TrashIcon className="size-3.5"/>
                        </Button>
                    </ItemActions>
                </Item>

            ))}
            <Button
                variant="outline"
                size="sm"
                className="!w-full"
                onClick={() =>
                    onChange([
                        ...validValue,
                        {
                            id: crypto.randomUUID(),
                            label: `Seçenek ${validValue.length + 1}`,
                        },
                    ])
                }
            >
                <PlusIcon className="size-3"/>
                Seçenek Ekle
            </Button>
        </div>
    )
}