import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function Loading() {
  return (
    <Box role="status" aria-label="Loading page">
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Skeleton
          variant="rectangular"
          height={56}
          sx={{ flex: 1, borderRadius: 1 }}
        />
        <Skeleton
          variant="rectangular"
          width={100}
          height={56}
          sx={{ borderRadius: 1 }}
        />
      </Stack>

      <Skeleton
        variant="rectangular"
        sx={{ flex: 1, minHeight: 200, borderRadius: 1, mt: 2 }}
      />
    </Box>
  );
}
