import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fluid } from '@/lib/theme';

interface SkeletonSection {
  headingVariant: 'h4' | 'h5';
  headingWidth: string;
  lines: readonly string[];
  mt?: number;
}

const SECTIONS = [
  {
    headingVariant: 'h4',
    headingWidth: '50%',
    lines: ['100%', '100%', '75%'],
  },
  {
    headingVariant: 'h5',
    headingWidth: '35%',
    lines: ['100%', '90%', '100%', '60%'],
    mt: 1.5,
  },
  {
    headingVariant: 'h5',
    headingWidth: '40%',
    lines: ['100%', '85%', '50%'],
    mt: 1.5,
  },
] as const satisfies readonly SkeletonSection[];

const SKELETON_MIN_HEIGHT = `calc(${fluid.panelMaxHeight} - clamp(24px, 16px + 2cqi, 40px))`;

function SectionSkeleton({
  headingVariant,
  headingWidth,
  lines,
  mt,
}: SkeletonSection) {
  return (
    <Box sx={mt ? { mt } : undefined}>
      <Typography
        variant={headingVariant}
        sx={{ borderBottom: 1, borderColor: 'divider', pb: 0.5, my: 1.5 }}
      >
        <Skeleton variant="text" width={headingWidth} />
      </Typography>
      {lines.map((width, i) => (
        <Typography key={i} variant="body1" sx={{ mb: fluid.paragraphMb }}>
          <Skeleton variant="text" width={width} />
        </Typography>
      ))}
    </Box>
  );
}

export function MarkdownSkeleton() {
  return (
    <Stack
      role="status"
      aria-label="Markdown preview loading"
      sx={{ minHeight: SKELETON_MIN_HEIGHT, overflow: 'hidden' }}
    >
      <SectionSkeleton {...SECTIONS[0]} />
      <SectionSkeleton {...SECTIONS[1]} />
      <Skeleton
        variant="rounded"
        sx={{ flexGrow: 1, minHeight: 80, mt: fluid.paragraphMb }}
      />
      <SectionSkeleton {...SECTIONS[2]} />
    </Stack>
  );
}
