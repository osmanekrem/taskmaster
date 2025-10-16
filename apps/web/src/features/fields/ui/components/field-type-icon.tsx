import {fieldTypeIcons} from "../../constants/icons";

interface FieldTypeIconProps {
    name: string;
}

export default function FieldTypeIcon({name}: FieldTypeIconProps) {
    const icon = fieldTypeIcons.find((i) => i.name === name);
    if (!icon) return null;
    return <icon.icon className="size-4"/>;
}
