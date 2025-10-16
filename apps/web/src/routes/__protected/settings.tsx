import {createFileRoute, Link, Outlet} from "@tanstack/react-router";
import GoBackButton from "@/components/go-back-button";
import {BugIcon, LayoutTemplateIcon, TextCursorInputIcon, UserIcon} from "lucide-react";
import {buttonVariants} from "@/components/ui/button";

const routes = [
    {
        label: "Genel",
        items: [
            {
                label: "Profil Ayarları",
                to: "/settings/profile",
                icon: UserIcon,
            },
        ],
    },
    {
        label: "Değişkenler",
        items: [
            {
                label: "Bilet Türleri",
                to: "/settings/ticket-types",
                icon: BugIcon,
            },
            {
                label: "Alanlar",
                to: "/settings/fields",
                icon: TextCursorInputIcon,
            },
        ],
    },
];

export const Route = createFileRoute("/__protected/settings")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div className="flex flex-col w-full h-full gap-8">
            <div className="flex justify-between items-center w-full mb-4">
                <div className="flex items-center gap-x-2">
                    <GoBackButton to="/dashboard"/>
                    <h1 className="text-2xl font-bold leading-tight truncate">Ayarlar</h1>
                </div>
            </div>

            <div className="flex items-start h-full gap-x-4">
                <ul className="max-w-48 border-r pr-4 overflow-y-auto w-full h-full flex flex-col gap-y-2">
                    {routes.map((route, index) => (
                        <li key={index} className="w-full">
                            <p className="text-sm font-medium text-muted-foreground px-2 mb-2">
                                {route.label}
                            </p>
                            {route.items.map((route) => (
                                <div key={route.to}>
                                    <Link
                                        to={route.to}
                                        activeProps={{
                                            className: buttonVariants({
                                                size: "lg",
                                                className: "w-full justify-start",
                                            }),
                                        }}
                                        className={buttonVariants({
                                            variant: "ghost",
                                            size: "lg",
                                            className: "w-full justify-start",
                                        })}
                                    >
                                        <route.icon className="size-5"/>
                                        {route.label}
                                    </Link>
                                </div>
                            ))}
                        </li>
                    ))}
                </ul>
                <Outlet/>
            </div>
        </div>
    );
}
