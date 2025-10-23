import { useQuery } from "@tanstack/react-query";
import { getFieldsForTicketTypeQuery } from "@/features/ticket-types/lib/queries";
import { useEffect, useState } from "react";
import { getFieldsQuery } from "@/features/fields/lib/queries";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Icon } from "@/components/ui/icon-picker";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/shadcn-io/kanban";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface TicketTypeFields {
  id: string;
}

const columns = [
  { id: "0", name: "Atanmış" },
  { id: "1", name: "Atanmadı" },
];

export default function TicketTypeFields({ id }: TicketTypeFields) {
  const { data } = useQuery(getFieldsForTicketTypeQuery(id));
  const { data: fieldsData } = useQuery(getFieldsQuery);

  const [fields, setFields] = useState<any[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    setFields(
      fieldsData?.data.map((field) => ({
        ...field,
        column: data?.some((item) => item.field.id === field.id)
          ? columns[0].id
          : columns[1].id,
      })) || []
    );
  }, [fieldsData]);

  return (
    <KanbanProvider columns={columns} data={fields} onDataChange={setFields}>
      {(column) => (
        <KanbanBoard id={column.id} key={column.id}>
          <KanbanHeader>
            <div className="flex items-center gap-2">
              <span>{column.name}</span>
            </div>
          </KanbanHeader>
          <KanbanCards id={column.id}>
            {(field: (typeof fields)[number]) => (
              <KanbanCard
                column={column.id}
                id={field.id}
                key={field.id}
                name={field.name}
              >
                <ItemMedia>
                  <Icon className="size-4" name={field.icon} />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{field.name}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();

                      navigate({
                        to: "/settings/fields/$id",
                        params: { id: field.id },
                      });
                    }}
                  >
                    <Icon className="size-4" name="eye" />
                  </Button>
                </ItemActions>
              </KanbanCard>
            )}
          </KanbanCards>
        </KanbanBoard>
      )}
    </KanbanProvider>
  );
}
