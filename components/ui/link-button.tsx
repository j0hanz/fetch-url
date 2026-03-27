'use client';

import Link from 'next/link';

import Button, { type ButtonProps } from '@mui/material/Button';

type LinkButtonProps = Omit<ButtonProps<typeof Link>, 'component'>;

export default function LinkButton(props: LinkButtonProps) {
  return <Button component={Link} {...props} />;
}
