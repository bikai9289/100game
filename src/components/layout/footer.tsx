import { getFooterLinks } from '@/config/footer-config';
import { isLinkActive } from '@/lib/urls';
import { cn } from '@/lib/utils';
import Container from '@/components/layout/container';
import { Logo } from '@/components/shared/logo';
import { Link, useLocation } from '@tanstack/react-router';
import { websiteConfig } from '@/config/website';

export function Footer({ className }: React.HTMLAttributes<HTMLElement>) {
  const pathname = useLocation().pathname;
  const footerLinks = getFooterLinks();

  return (
    <footer className={cn('border-t border-border bg-card py-9', className)}>
      <Container className="px-[18px]">
        <div className="mx-auto grid max-w-[1180px] gap-[22px] sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Logo className="size-7 rounded-[7px] text-xs" />
              <span className="text-base font-extrabold">
                {websiteConfig.metadata?.name}
              </span>
            </div>
            <p className="mt-2.5 max-w-80 text-sm text-muted-foreground">
              Play the free Name 100 Women Challenge online. Type famous women,
              beat the 12-minute timer, and challenge your friends.
            </p>
          </div>

          {footerLinks?.map((section) => (
            <div key={section.title}>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {section.title}
              </span>
              <ul className="mt-2.5 space-y-1.5">
                {section.items?.map(
                  (item) =>
                    item.href && (
                      <li key={item.title}>
                        {item.external ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm transition-colors duration-150 hover:text-primary focus-visible:text-primary"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <Link
                            to={item.href}
                            data-active={
                              item.href.includes('#')
                                ? undefined
                                : isLinkActive(item.href, pathname)
                                  ? 'true'
                                  : undefined
                            }
                            className="text-sm transition-colors duration-150 hover:text-primary focus-visible:text-primary data-[active=true]:font-semibold data-[active=true]:text-primary"
                          >
                            {item.title}
                          </Link>
                        )}
                      </li>
                    )
                )}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[0.8125rem] text-muted-foreground">
          &copy; {new Date().getFullYear()} {websiteConfig.metadata?.name}. All
          rights reserved.
        </p>
      </Container>
    </footer>
  );
}
