import {cn} from "@/lib/utils";
import {buttonVariants} from "@/components/ui/button";
import {ArrowLeftIcon} from "lucide-react";
import {Link} from "@tanstack/react-router";

interface Props {
    to?: string;
    className?: string;
}

export default function GoBackButton({
                                         to = "..",
                                         className = "",
                                     }: Props) {
    return (
        <Link to={to}
              className={cn(className, "!rounded-full ", buttonVariants({variant: "outline", size: "icon"}))}>
            <ArrowLeftIcon/>
        </Link>
    );
}