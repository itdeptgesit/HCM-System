import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ModalWrapperProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Additional Tailwind classes for the inner content */
  className?: string;
};

export const ModalWrapper = ({ isOpen, onClose, children, className }: ModalWrapperProps) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal>
    <DialogContent 
      showCloseButton={false} 
      className={cn('bg-card text-card-foreground rounded-2xl shadow-2xl w-full sm:max-w-4xl flex flex-col max-h-[95vh] p-0 overflow-hidden border border-border', className)}
    >
      {children}
    </DialogContent>
  </Dialog>
);
