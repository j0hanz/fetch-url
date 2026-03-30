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
  fullScreen?: boolean;
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
  fullScreen,
}: BaseDialogProps) {
  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down('xs'));
  const isFullScreen = fullScreen ?? smallScreen;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      fullWidth
      fullScreen={isFullScreen}
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
