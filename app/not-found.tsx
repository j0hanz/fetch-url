import LinkButton from '@/components/ui/link-button';
import { StatusShell } from '@/components/ui/status-shell';

export default function NotFound() {
  return (
    <StatusShell
      title="Page not found"
      message="The page you are looking for does not exist."
      minHeight="50vh"
      action={
        <LinkButton href="/" variant="contained">
          Go home
        </LinkButton>
      }
    />
  );
}
