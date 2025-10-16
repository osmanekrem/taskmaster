import TicketTypeList from "../components/ticket-type-list";
import AddTicketTypeModal from "../components/add-ticket-type-modal";
import { Separator } from "@/components/ui/separator";
import { Outlet } from "@tanstack/react-router";

export default function TicketTypes() {
  return (
    <div className="flex flex-col w-full h-full space-y-4">
      <AddTicketTypeModal />

      <div className="flex items-start w-full flex-1 min-h-0 gap-4">
        <TicketTypeList />
        <Separator orientation="vertical" className="h-full" />
        <div className="flex items-start w-full flex-1 h-full min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
