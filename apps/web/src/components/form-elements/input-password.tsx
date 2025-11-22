import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import React from "react";
import {EyeIcon, EyeOff} from "lucide-react";

export default function InputPassword({
                                          className,
                                          ...props
                                      }: React.InputHTMLAttributes<HTMLInputElement>) {
    const [showPassword, setShowPassword] = React.useState(false);
    return (
        <div className={cn(
            "dark:bg-input/30 group border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
            "has-[:invalid]:ring-destructive/20 dark:has-[:invalid]:ring-destructive/40 has-[:invalid]:border-destructive",
            className
        )}>
            <input
                type={showPassword ? "text" : "password"}
                data-slot="input"
                className="placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-full flex-1 min-w-0 bg-transparent !outline-none"
                {...props}
            />
            <button
                type="button"
                className="ml-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
            >
                {showPassword ? <EyeIcon className="size-5"/> : <EyeOff className="size-5"/>}
            </button>
        </div>
    );
}