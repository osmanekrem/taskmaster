import {Separator} from "@/components/ui/separator";
import {Outlet} from "@tanstack/react-router";
import FieldList from "@/features/fields/ui/components/field-list";
import AddFieldModal from "@/features/fields/ui/components/add-field-modal";

export default function Fields() {
    return (
        <div className="flex flex-col w-full h-full space-y-4">
            <AddFieldModal/>

            <div className="flex items-start w-full flex-1 min-h-0 gap-4">
                <FieldList/>
                <Separator orientation="vertical" className="h-full"/>
                <div className="flex items-start w-full flex-1 h-full min-w-0">
                    <Outlet/>
                </div>
            </div>
        </div>
    );
}