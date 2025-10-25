"use client"

import {
    TimeField as TimeFieldRac,
    DateInput as DateInputRac,
    DateSegment,
    type TimeFieldProps as TimeFieldPropsRac,
} from "react-aria-components"
import {cn} from "@/lib/utils"
import React from "react"

interface TimeInputProps extends TimeFieldPropsRac<any> {
    className?: string
    inputClassName?: string
}

export function TimeInput({className, inputClassName, ...props}: TimeInputProps) {
    return (
        <TimeFieldRac
            className={cn(
                "flex flex-col gap-1",
                className,
            )}
            {...props}
        >
            <DateInputRac
                className={cn(
                    "inline-flex h-9 w-full items-center gap-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-1 focus-within:ring-ring",
                    inputClassName,
                )}
            >
                {(segment) => (
                    <DateSegment
                        segment={segment}
                        className="inline rounded p-0.5 caret-transparent outline outline-0 data-[focused]:bg-accent data-[placeholder]:text-muted-foreground data-[type=literal]:px-0 data-[focused]:data-[placeholder]:text-foreground"
                    />
                )}
            </DateInputRac>
        </TimeFieldRac>
    )
}