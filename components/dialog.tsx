'use client';

import type { ReactNode } from 'react';

import Button from '@mui/material/Button';
import Dialog, { type DialogProps } from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { visuallyHidden } from '@mui/utils';

interface BaseDialogProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: ReactNode;
  hiddenTitle?: boolean;
  header?: ReactNode;
  children: ReactNode;
  maxWidth?: DialogProps['maxWidth'];
  actions?: ReactNode;
}

export function BaseDialog({
  open,
  onClose,
  titleId,
  title,
  hiddenTitle,
  header,
  children,
  maxWidth,
  actions,
}: BaseDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      fullWidth
      fullScreen={fullScreen}
      maxWidth={maxWidth}
      scroll="paper"
    >
      <DialogTitle id={titleId} sx={hiddenTitle ? visuallyHidden : undefined}>
        {title}
      </DialogTitle>
      {header}
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        {actions ?? (
          <Button fullWidth size="large" onClick={onClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
