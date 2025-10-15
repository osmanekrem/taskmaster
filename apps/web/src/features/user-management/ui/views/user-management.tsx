import {Link} from "@tanstack/react-router";
import {buttonVariants} from "@/components/ui/button";
import {PlusIcon} from "lucide-react";
import {DataTable, type TableOptions, turkishTranslations} from "tanstack-shadcn-table";
import UserAvatar from "@/components/user-avatar";
import {authClient, type User} from "@/lib/auth-client";
import {useState} from "react";
import ActionMenu from "@/features/user-management/ui/components/action-menu";
import {useQuery} from "@tanstack/react-query";
import {getUsersQuery} from "@/features/user-management/lib/queries";

export default function UserManagement() {
    const [limit, setLimit] = useState<number>(20);
    const [offset, setOffset] = useState<number>(0);

    const handleLazyLoad = ({first, rows}: { first: number; rows: number }) => {
        setOffset(first);
        setLimit(rows);
    }

    const {data, isPending} = useQuery(getUsersQuery(limit, offset))

    const tableOptions: TableOptions<User> = {
        columns: [
            {
                accessorKey: "id",
                header: "#",
                size: 60,
                minSize: 60,
                maxSize: 60,
                enableResizing: false,
                cell: ({row}) => <ActionMenu rowData={row.original}/>,
            },
            {
                accessorKey: "name",
                header: "Ad",
                cell: ({row}) => {
                    return (
                        <div className="flex items-center gap-2">
                            <UserAvatar user={row.original}
                                        className="w-10 h-10"
                            />
                            <span>{row.original.name}</span>
                        </div>
                    );
                }
            },
            {
                accessorKey: "email",
                header: "E-posta",
            },
            {
                accessorKey: "role",
                header: "Rol"
            },
            {
                accessorKey: "createdAt",
                header: "Oluşturulma Tarihi",
                cell: ({row}) => new Date(row.original.createdAt).toLocaleDateString(),
            }
        ],
        data: (data?.data?.users ?? []) as User[],
        lazy: true,
        onLazyLoad: handleLazyLoad,
        pagination: {
            pageSize: 20,
            totalRecords: data?.data?.total ?? 0,
        },
        translations: turkishTranslations,
        enableColumnResizing: true,
        columnResizeMode: "onChange",
    }
    return (
        <div className="flex flex-col w-full h-full">
            <div className="flex justify-between items-center w-full">

                <h1 className="text-2xl font-bold leading-tight truncate">
                    Kullanıcı Yönetimi
                </h1>

                <Link to="/user-management/create-user" className={buttonVariants()}>
                    <PlusIcon/>
                    Kullanıcı Ekle
                </Link>
            </div>

            <div className="w-full h-full mt-4">

                <DataTable className="w-full" tableOptions={tableOptions}/>
            </div>
        </div>
    )
}