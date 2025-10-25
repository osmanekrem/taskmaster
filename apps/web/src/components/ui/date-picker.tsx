import {CalendarIcon} from "lucide-react"
import {
    Button, composeRenderProps,
    DatePicker as DatePickerRac, type DateValue,
    Dialog,
    Group,
    type DatePickerProps as DatePickerPropsRac,
    Popover,
} from "react-aria-components"

import {Calendar} from "@/components/ui/calendar-rac"
import {DateInput} from "@/components/ui/datefield-rac"
import {cn} from "@/lib/utils";

export interface DatePickerProps<T extends DateValue> extends Omit<DatePickerPropsRac<T>, 'children'> {


    /**
     * Custom className for the date picker wrapper
     */
    className?: string;

    /**
     * Custom className for the date input field
     */
    inputClassName?: string;

    /**
     * Custom className for the calendar button
     */
    buttonClassName?: string;

    /**
     * Custom className for the popover
     */
    popoverClassName?: string;

    /**
     * Custom className for the calendar
     */
    calendarClassName?: string;

    /**
     * Size variant of the date picker
     * @default "default"
     */
    size?: "sm" | "default" | "lg";
}

const sizeVariants = {
    sm: {
        input: "h-8 text-xs px-2",
        button: "w-8 -ms-8",
        icon: 14,
    },
    default: {
        input: "h-9 text-sm px-3",
        button: "w-9 -ms-9",
        icon: 16,
    },
    lg: {
        input: "h-10 text-base px-4",
        button: "w-10 -ms-10",
        icon: 18,
    },
};

export function DatePicker<T extends DateValue>({
                                                    className,
                                                    inputClassName,
                                                    buttonClassName,
                                                    popoverClassName,
                                                    calendarClassName,
                                                    size = "default",
                                                    ...props
                                                }: DatePickerProps<T>) {
    const sizeClasses = sizeVariants[size];

    return (
        <DatePickerRac
            {...props}
            className={composeRenderProps(className, (className) =>
                cn("group flex flex-col gap-2", className)
            )}
        >

            <div className="flex">
                <Group className="w-full">
                    <DateInput
                        className={cn(
                            "pe-9",
                            sizeClasses.input,
                            inputClassName
                        )}
                    />
                </Group>
                <Button
                    className={cn(
                        "z-10 -me-px flex items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed data-focus-visible:border-ring data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50",
                        sizeClasses.button,
                        buttonClassName
                    )}
                >
                    <CalendarIcon size={sizeClasses.icon}/>
                </Button>
            </div>

            <Popover
                className={cn(
                    "z-50 rounded-lg border max-w-2xs bg-background text-popover-foreground shadow-lg outline-hidden data-entering:animate-in data-exiting:animate-out data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2",
                    popoverClassName
                )}
                offset={4}
                placement={"bottom right"}
            >
                <Dialog className="max-h-[inherit] overflow-auto p-2">
                    <Calendar className={calendarClassName}/>
                </Dialog>
            </Popover>
        </DatePickerRac>
    );
}
