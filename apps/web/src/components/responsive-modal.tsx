import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent } from "./ui/dialog";
import { Drawer, DrawerContent } from "./ui/drawer";

interface ResponsiveModalProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ResponsiveModal({
  children,
  open,
  onOpenChange,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="overflow-y-auto max-h-[80vh] hide-scrollbar">
          {children}
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="w-full sm:max-w-lg p-0 border-none overflow-y-auto hide-scrollbar">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
