import { useMemo } from "react";
import { IconPicker, Icon, type IconName } from "@/components/ui/icon-picker";
import { iconsData } from "@/components/ui/icons-data";
import { Button } from "@/components/ui/button";

interface FieldTypeIconSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function FieldTypeIconSelect({
  value,
  onChange,
}: FieldTypeIconSelectProps) {

  return (
    <IconPicker
      value={value as IconName}
      onValueChange={(newValue) => onChange(newValue)}
      triggerPlaceholder="Alan ikonu seç"
      searchPlaceholder="İkon ara..."
    >
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
      >
        {value ? (
          <>
            <Icon name={value as IconName} className="mr-2 h-4 w-4" />
            {value}
          </>
        ) : (
          "Alan ikonu seç"
        )}
      </Button>
    </IconPicker>
  );
}
