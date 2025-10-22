import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  BadgeCheckIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  TrashIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, type JSX } from "react";
import { IconPicker, Icon, type IconName } from "./ui/icon-picker";
import { iconsData } from "./ui/icons-data";
import { useQuery } from "@tanstack/react-query";
import { getSelectOptionsByFieldOptionIdQuery } from "@/features/fields/lib/queries";

const types: Record<string, any> = {
  boolean: BooleanFormElement,
  static_select_options: StaticSelectOptionsFormElement,
};

export default function TypeFormElement({
  type,
  ...props
}: { type: string } & any) {
  const Component = types[type];
  if (!Component) return null;
  return <Component {...props} />;
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
      <Checkbox
        id={id}
        checked={JSON.parse(value)}
        onCheckedChange={onChange}
      />
      <Label htmlFor={id}>{name}</Label>
    </div>
  );
}

export interface SelectOption {
  id?: string;
  label: string;
  icon: string;
}

export interface SelectOptionsFormElementProps {
  id: string;
  value: SelectOption[];
  onChange: (optionId: string, options: SelectOption[]) => void;
}

export function StaticSelectOptionsFormElement({
  id,
  value,
  onChange,
}: SelectOptionsFormElementProps) {
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(
    null
  );

  if (!value) return null;
  return (
    <div className="flex flex-col space-y-1 w-full">
      {value?.map((option: SelectOption, index: number) => (
        <Item variant="outline" size="sm" key={index}>
          <ItemMedia>
            {editingOptionIndex === index ? (
              <IconPicker
                value={option.icon as IconName}
                onValueChange={(e: any) => {
                  const newOptions = [...value];
                  newOptions[index] = {
                    ...newOptions[index],
                    icon: e,
                  };
                  onChange(id, newOptions);
                }}
              />
            ) : (
              <Icon className="size-4" name={option.icon as IconName} />
            )}
          </ItemMedia>
          <ItemContent>
            {editingOptionIndex === index ? (
              <div className="flex flex-col space-y-2">
                <input
                  type="text"
                  className="w-full border rounded-md px-2 py-1"
                  value={option.label}
                  onChange={(e) => {
                    const newOptions = [...value];
                    newOptions[index] = {
                      ...newOptions[index],
                      label: e.target.value,
                    };
                    onChange(id, newOptions);
                  }}
                />
              </div>
            ) : (
              <ItemTitle>{option.label}</ItemTitle>
            )}
          </ItemContent>
          <ItemActions>
            {editingOptionIndex === index ? (
              <Button
                onClick={() => setEditingOptionIndex(null)}
                variant="ghost"
                className="p-1.5"
                size="icon"
              >
                <SaveIcon className="size-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setEditingOptionIndex(index)}
                  variant="ghost"
                  className="p-1.5"
                  size="icon"
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              </>
            )}
            <Button
              onClick={() => {
                const newOptions = value.filter((_, i) => i !== index);
                onChange(id, newOptions);
              }}
              variant="ghost"
              className="p-1.5"
              size="icon"
            >
              <TrashIcon className="size-3.5" />
            </Button>
          </ItemActions>
        </Item>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="!w-full"
        onClick={() =>
          onChange(id, [
            ...value,
            {
              label: `Seçenek ${value.length + 1}`,
              icon: iconsData[0].name,
            },
          ])
        }
      >
        <PlusIcon className="size-3" />
        Seçenek Ekle
      </Button>
    </div>
  );
}
