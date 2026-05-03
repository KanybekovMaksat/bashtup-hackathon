import type { ReactNode } from 'react';
import { Button, Modal, useOverlayState } from '@heroui/react';

type DashboardModalProps = {
  children: ReactNode;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function DashboardModal({
  children,
  footer,
  isOpen,
  onClose,
  title,
}: DashboardModalProps) {
  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) {
        onClose();
      }
    },
  });

  return (
    <Modal state={state}>
      <Modal.Backdrop>
        <Modal.Container placement="center" scroll="inside" size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            <Modal.Footer>
              {footer}
              <Button onPress={onClose} variant="outline">
                Закрыть
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
