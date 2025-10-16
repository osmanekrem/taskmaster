import {
  BugIcon,
  CircleFadingArrowUpIcon,
  CloudUploadIcon,
  HelpCircleIcon,
  SquareCheckBigIcon,
  SquarePlusIcon,
  BookOpenIcon,
  CircleHelpIcon,
  WrenchIcon,
  HeadsetIcon,
  CodeIcon,
  PencilIcon,
  TestTubeIcon,
  ChartLineIcon,
  ShieldIcon,
  type LucideIcon,
} from "lucide-react";

export const ticketTypeIcons: { name: string; icon: LucideIcon }[] = [
  {
    name: "bug",
    icon: BugIcon,
  },
  {
    name: "feature",
    icon: SquarePlusIcon,
  },
  {
    name: "task",
    icon: SquareCheckBigIcon,
  },
  {
    name: "improvement",
    icon: CircleFadingArrowUpIcon,
  },
  {
    name: "documentation",
    icon: BookOpenIcon,
  },
  {
    name: "question",
    icon: HelpCircleIcon,
  },
  {
    name: "maintenance",
    icon: WrenchIcon,
  },
  {
    name: "support",
    icon: HeadsetIcon,
  },
  {
    name: "development",
    icon: CodeIcon,
  },
  {
    name: "design",
    icon: PencilIcon,
  },
  {
    name: "testing",
    icon: TestTubeIcon,
  },
  {
    name: "deployment",
    icon: CloudUploadIcon,
  },
  {
    name: "performance",
    icon: ChartLineIcon,
  },
  {
    name: "security",
    icon: ShieldIcon,
  },
];
