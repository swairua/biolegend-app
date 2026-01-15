import { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string | ReactNode;
  itemName?: string;
  isLoading?: boolean;
  isDangerous?: boolean;
  actionLabel?: string;
  loadingLabel?: string;
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  title = 'Delete Item',
  description = 'This action cannot be undone.',
  itemName,
  isLoading = false,
  isDangerous = true,
  actionLabel = 'Delete',
  loadingLabel = 'Deleting...',
}: DeleteConfirmationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {typeof description === 'string' ? (
              <>
                {itemName ? `Are you sure you want to delete ${itemName}? ` : ''}
                {description}
              </>
            ) : (
              description
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={isDangerous ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {isLoading ? loadingLabel : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
