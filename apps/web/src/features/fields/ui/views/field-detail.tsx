import { useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import useEditFieldModal from "@/features/fields/hooks/use-edit-field-modal";
import EditFieldModal from "@/features/fields/ui/components/edit-field-modal";
import DeleteFieldButton from "@/features/fields/ui/components/delete-field-button";
import { Route } from "@/routes/__protected/settings/fields/$id";
import {
  BooleanFormElement,
  StaticSelectOptionsFormElement,
} from "@/components/type-form-element";
import { useEffect, useState } from "react";
import { queryClient } from "@/utils/trpc";
import { getSelectOptionsByFieldOptionIdsQuery } from "@/features/fields/lib/queries";
import { useMutation } from "@tanstack/react-query";
import {
  saveSelectOptionsMutation,
  updateFieldOptionValueMutation,
} from "@/features/fields/lib/mutations";
import { Icon } from "@/components/ui/icon-picker";

export default function FieldDetail() {
  const { id } = useParams({ from: Route.id });
  const data = Route.useLoaderData();
  const { open } = useEditFieldModal();
  const saveSelectOptions = useMutation(saveSelectOptionsMutation);
  const updateFieldOptionValue = useMutation(updateFieldOptionValueMutation);

  const [optionsData, setOptionsData] = useState(data?.options || []);

  const [originalOptionsData, setOriginalOptionsData] = useState<any>({});
  const [selectOptionsData, setSelectOptionsData] = useState<any>({});
  const [isUpdated, setIsUpdated] = useState(false);
  const [optionsChanged, setOptionsChanged] = useState(false);

  const onSave = () => {
    optionsData.forEach((option) => {
      updateFieldOptionValue.mutate({
        fieldId: data.id,
        fieldOptionId: option.id,
        value:
          typeof option.value === "string"
            ? option.value
            : JSON.stringify(option.value),
      });
    });

    const dynamicOption = optionsData.find(
      (option) => option.key === "is-dynamic-options"
    );
    if (dynamicOption && JSON.parse(dynamicOption.value) === false) {
      const selectOptions = selectOptionsData[dynamicOption.id] || [];
      saveSelectOptions.mutate({
        fieldOptionId: dynamicOption.id,
        options: selectOptions,
      });
    }

    setIsUpdated(false);
    setOptionsChanged(false);
  };

  const onChangeOption = (optionId: string, newValue: any) => {
    setOptionsData((prevOptions) =>
      prevOptions.map((option) =>
        option.id === optionId ? { ...option, value: newValue } : option
      )
    );
  };

  const fetchSelectOptions = async (optionIds: string[]) => {
    return await queryClient.fetchQuery(
      getSelectOptionsByFieldOptionIdsQuery(optionIds)
    );
  };

  const onChangeSelectOptions = (optionId: string, newOptions: any[]) => {
    setSelectOptionsData((prev: any) => ({
      ...prev,
      [optionId]: newOptions,
    }));
  };
  useEffect(() => {
    if (!data) return;
    setOptionsData(data.options || []);
    if (data.options.some((option) => option.key === "is-dynamic-options")) {
      fetchSelectOptions(
        data.options
          .filter((opt) => opt.key === "is-dynamic-options")
          .map((opt: any) => opt.id)
      ).then((res) => {
        const selectOptionsMap: any = {};
        data.options
          .filter((opt) => opt.key === "is-dynamic-options")
          .forEach((option: any) => {
            selectOptionsMap[option.id] = res.data.filter(
              (selectOption: any) => selectOption.fieldOptionId === option.id
            );
          });
        setSelectOptionsData(selectOptionsMap);
        setOriginalOptionsData(selectOptionsMap);
      });
    }

    setIsUpdated(false);
  }, [data]);

  useEffect(() => {
    if (
      JSON.stringify(
        optionsData.map((option) => ({
          ...option,
          value:
            typeof option.value === "string"
              ? option.value
              : JSON.stringify(option.value),
        }))
      ) !== JSON.stringify(data?.options)
    ) {
      setIsUpdated(true);
    } else {
      setIsUpdated(false);
    }
  }, [optionsData]);

  useEffect(() => {
    const dynamicOption = optionsData.find(
      (option) => option.key === "is-dynamic-options"
    );
    if (dynamicOption && JSON.parse(dynamicOption.value) === false) {
      const originalSelectOptions = originalOptionsData || {};
      const currentSelectOptions = selectOptionsData[dynamicOption.id] || [];
      if (
        JSON.stringify(currentSelectOptions) !==
        JSON.stringify(originalSelectOptions[dynamicOption.id] || [])
      ) {
        setOptionsChanged(true);
      } else {
        setOptionsChanged(false);
      }
    }
  }, [selectOptionsData, optionsData, data]);

  return (
    <div className="flex flex-col w-full h-full space-y-4">
      <EditFieldModal />
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold leading-tight flex items-center gap-2 truncate">
          <Icon name={data?.icon ?? ""} />
          {data.name}
        </h2>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => open(id)}>
            <PencilIcon className="size-4" />
            Düzenle
          </Button>
          <DeleteFieldButton id={id} />
        </div>
      </div>
      {data?.description && (
        <p className="text-sm text-muted-foreground">{data.description}</p>
      )}
      {optionsData.map((option) => {
        switch (option.type) {
          case "boolean":
            const isDynamicSelectOptions = option.key === "is-dynamic-options";
            return (
              <>
                <div
                  key={option.id}
                  className="p-4 border rounded-md flex items-center justify-between"
                >
                  <BooleanFormElement
                    id={option.id}
                    name={option.name}
                    value={option.value}
                    onChange={(value: any) => onChangeOption(option.id, value)}
                  />
                </div>
                {isDynamicSelectOptions &&
                  (JSON.parse(option.value) === true ? (
                    <></>
                  ) : (
                    <StaticSelectOptionsFormElement
                      onChange={onChangeSelectOptions}
                      value={selectOptionsData[option.id]}
                      id={option.id}
                    />
                  ))}
              </>
            );
          case "string":
          case "number":
          case "select":
            break;
          default:
            return null;
        }
      })}

      {(isUpdated || optionsChanged) && (
        <p className="text-sm text-warning">
          Dikkat: Alan seçeneklerinde değişiklik yaptınız, ancak bu
          değişiklikler kaydedilmedi.
        </p>
      )}

      <Button
        disabled={!(isUpdated || optionsChanged)}
        onClick={onSave}
        className="w-full"
      >
        Değişiklikleri Kaydet
      </Button>
    </div>
  );
}
