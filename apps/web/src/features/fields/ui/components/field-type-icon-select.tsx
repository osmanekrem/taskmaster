import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fieldTypeIcons } from "@/features/fields/constants/icons";
import { Icon, type IconName } from "@/components/ui/icon-picker";

interface FieldTypeIconSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function FieldTypeIconSelect({
  value,
  onChange,
}: FieldTypeIconSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue
          className="flex items-center gap-2 w-full"
          placeholder="Alan ikonu seç"
        />
      </SelectTrigger>
      <SelectContent>
        {fieldTypeIcons?.map((icon) => (
          <SelectItem key={icon.name} value={icon.name}>
            <Icon name={icon.name as IconName} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
