import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function NotFound() {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '50vh',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6" color="error">
          Page not found
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ maxWidth: 400 }}
        >
          The page you are looking for does not exist.
        </Typography>
        <Button href="/" variant="contained">
          Go home
        </Button>
      </Stack>
    </Box>
  );
}
