import { m } from '@/locale/paraglide/messages';
import { getNavbarLinks } from '@/config/navbar-config';
import { useScroll } from '@/hooks/use-scroll';
import { isLinkActive } from '@/lib/urls';
import { cn } from '@/lib/utils';
import Container from '@/components/layout/container';
import { Logo } from '@/components/shared/logo';
import { NavbarMobile } from '@/components/layout/navbar-mobile';
import { Link, useLocation } from '@tanstack/react-router';
import { websiteConfig } from '@/config/website';

interface NavbarProps {
  scroll?: boolean;
}

export function Navbar({ scroll = true }: NavbarProps) {
  const pathname = useLocation().pathname;
  const scrolled = useScroll(50);
  const menuLinks = getNavbarLinks();
  const showBarBg = scroll && scrolled;

  return (
    <header
      className={cn(
        'sticky inset-x-0 top-0 z-40 border-border bg-background/95 backdrop-blur transition-all duration-300',
        showBarBg && 'border-b'
      )}
    >
      <div className="relative z-10 bg-background/80">
        <Container className="px-[18px]">
          <nav
            aria-label={m.common_main_navigation()}
            className="hidden h-16 items-center justify-between gap-5 sm:flex"
          >
            <Link
              to="/"
              aria-label={m.common_home()}
              className="flex shrink-0 items-center gap-2"
            >
              <Logo className="size-7 rounded-[7px] text-xs" />
              <span className="text-base font-extrabold">
                {websiteConfig.metadata?.name}
              </span>
            </Link>

            <div className="flex items-center gap-[18px]">
              {menuLinks?.map((item) => (
                <Link
                  key={item.title}
                  to={item.href ?? '#'}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'text-sm text-muted-foreground transition-colors hover:text-primary',
                    isLinkActive(item.href, pathname) && 'text-primary'
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </nav>

          <NavbarMobile className="sm:hidden" />
        </Container>
      </div>
    </header>
  );
}
