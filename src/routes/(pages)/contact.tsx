import Container from '@/components/layout/container';
import { buttonVariants } from '@/components/ui/button';
import { seo } from '@/lib/seo';
import { IconBrandGithub, IconDatabaseEdit } from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';

const repositoryIssues = 'https://github.com/bikai9289/100game/issues/new';

export const Route = createFileRoute('/(pages)/contact')({
  head: () =>
    seo('/contact', {
      title: 'Contact Name100Challenge',
      description:
        'Contact Name100Challenge about answer corrections, game feedback, privacy, or removal of leaderboard and community wall data.',
    }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <main className="border-b">
      <Container className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-normal">
            Contact Name100Challenge
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Report a missing or misclassified answer, a gameplay problem, or a
            privacy request through the project issue tracker.
          </p>

          <div className="mt-8 border-y py-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <IconDatabaseEdit className="size-5 text-primary" />
              Data and removal requests
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              For leaderboard or community wall removal, include the displayed
              name, message if applicable, game mode, and approximate posting
              date. Do not include private account or security information.
            </p>
          </div>

          <a
            href={repositoryIssues}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ className: 'mt-8' })}
          >
            <IconBrandGithub data-icon="inline-start" />
            Open a contact request
          </a>
        </div>
      </Container>
    </main>
  );
}
