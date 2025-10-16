import {
    ArrowUpDownIcon,
    BinaryIcon,
    Calendar1Icon,
    CaseSensitiveIcon, ClockIcon, Link2Icon, LinkIcon, TagsIcon,
    TextCursorIcon,
    TextCursorInputIcon,
    TextIcon, User2Icon
} from "lucide-react";

export const fieldTypeIcons = [
    {
        name: 'text',
        icon: CaseSensitiveIcon,
    },
    {
        name: 'textarea',
        icon: TextIcon,
    },
    {
        name: 'date',
        icon: Calendar1Icon,
    },
    {
        name: 'number',
        icon: BinaryIcon,
    },
    {
        name: 'single-select',
        icon: TextCursorIcon,
    },
    {
        name: 'multi-select',
        icon: TextCursorInputIcon,
    },
    {
        name: 'datetime',
        icon: ClockIcon,
    },
    {
        name: 'url',
        icon: LinkIcon,
    },
    {
        name: 'user',
        icon: User2Icon,
    },
    {
        name: 'tags',
        icon: TagsIcon,
    },
    {
        name: 'priority',
        icon: ArrowUpDownIcon,
    }
]