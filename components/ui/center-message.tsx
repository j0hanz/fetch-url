import type { ReactNode } from 'react';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { responsive, sx } from '@/lib/theme';

interface CenterMessageProps {
  message: ReactNode;
  secondaryText?: ReactNode;
  color?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export default function CenterMessage({
  message,
  secondaryText,
  color = 'text.secondary',
  action,
  children,
}: CenterMessageProps) {
  return (
    <Paper
      sx={{
        ...sx.markdownPanel,
        minHeight: responsive.panelMaxHeight,
        display: 'grid',
        alignContent: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack spacing={2} alignItems="center" sx={{ opacity: 0.8 }}>
        <Typography variant="body1" color={color} textAlign="center">
          {message}
        </Typography>
        {secondaryText && (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {secondaryText}
          </Typography>
        )}
        {action}
        {children}
      </Stack>
    </Paper>
  );
}
