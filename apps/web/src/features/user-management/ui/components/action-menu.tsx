import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {CopyIcon, EllipsisVertical, PencilIcon, TrashIcon} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {Button} from "@/components/ui/button";
import type {User} from "@/lib/auth-client";
import {toast} from "sonner";
import useConfirm from "@/hooks/use-confirm";
import {useDeleteUser} from "@/features/user-management/lib/api";

interface Props {
    rowData: User
}

export default function ActionMenu({rowData}: Props) {
    const [DeleteConfirmDialog, confirmDelete] = useConfirm("Silme Onayı", "Bu kullanıcıyı silmek istediğinize emin misiniz?", "Sil")

    const deleteUser = useDeleteUser(rowData.id)
    const copyIdToClipboard = () => {
        navigator.clipboard.writeText(rowData.id)
        toast.success("ID panoya kopyalandı!")
    }

    const handleDelete = async () => {
        const confirmed = await confirmDelete();
        if (confirmed) {
            await deleteUser.mutateAsync()
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                        <EllipsisVertical/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>
                        <button onClick={copyIdToClipboard} className="flex gap-x-2 items-center w-full">
                            <CopyIcon/>
                            ID'yi kopyala
                        </button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem>
                        <Link to={"/user-management/edit-user/$id"} params={{
                            id: rowData.id
                        }} className="gap-x-2 flex items-center w-full">
                            <PencilIcon/>
                            Düzenle
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <button onClick={handleDelete} className="gap-x-2 flex items-center w-full">
                            <TrashIcon/>
                            Sil
                        </button>
                    </DropdownMenuItem>
                </DropdownMenuContent>

            </DropdownMenu>
            <DeleteConfirmDialog/>
        </>
    )
}