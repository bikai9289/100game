import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/men')({
  component: MenLayout,
});

function MenLayout() {
  return <Outlet />;
}
