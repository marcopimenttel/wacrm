"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import {
  Building2,
  Bell,
  Bot,
  ChevronDown,
  Crown,
  GitBranch,
  Handshake,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Radio,
  Settings,
  Shield,
  User,
  UserCog,
  UserRoundCog,
  Users,
  UsersRound,
  Vote,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import type { AccountRole } from "@/lib/auth/roles";
import type { ModuleKey } from "@/lib/saas/modules";
import { ROUTE_MODULE } from "@/lib/saas/modules";
import { isPlatformAdminEmail } from "@/lib/saas/platform-admin";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

const SIDEBAR_COLLAPSED_KEY = "wacrm-sidebar-collapsed";

// Per-role chip metadata used in the sidebar's account strip + the
// Members tab roster. Keeping this near both consumers in a single
// place avoids drift between the two surfaces — when a designer
// wants to recolour "agent" rows, this is the one diff.
const ROLE_CHIP: Record<
  AccountRole,
  { icon: typeof Crown; labelKey: string; className: string }
> = {
  owner: {
    icon: Crown,
    labelKey: "roleOwner",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  admin: {
    icon: Shield,
    labelKey: "roleAdmin",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  agent: {
    icon: UserCog,
    labelKey: "roleAgent",
    className: "border-border bg-muted text-foreground",
  },
  viewer: {
    icon: User,
    labelKey: "roleViewer",
    className: "border-border bg-card text-muted-foreground",
  },
};

interface NavItem {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  /** Required SaaS module (migration 037). */
  module: ModuleKey;
  /**
   * When true, the nav row renders a small "Beta" chip after the label.
   * Purely informational — doesn't affect routing or access.
   */
  beta?: boolean;
}

/** Everything under the WhatsApp suite (current CRM surface). */
const whatsappNavItems: NavItem[] = [
  {
    href: "/dashboard",
    labelKey: "dashboard",
    icon: LayoutDashboard,
    module: ROUTE_MODULE["/dashboard"],
  },
  {
    href: "/inbox",
    labelKey: "inbox",
    icon: MessageSquare,
    module: ROUTE_MODULE["/inbox"],
  },
  {
    href: "/notifications",
    labelKey: "notifications",
    icon: Bell,
    module: ROUTE_MODULE["/notifications"],
  },
  {
    href: "/contacts",
    labelKey: "contacts",
    icon: Users,
    module: ROUTE_MODULE["/contacts"],
  },
  {
    href: "/pipelines",
    labelKey: "pipelines",
    icon: GitBranch,
    module: ROUTE_MODULE["/pipelines"],
  },
  {
    href: "/broadcasts",
    labelKey: "broadcasts",
    icon: Radio,
    module: ROUTE_MODULE["/broadcasts"],
  },
  {
    href: "/automations",
    labelKey: "automations",
    icon: Zap,
    module: ROUTE_MODULE["/automations"],
  },
  {
    href: "/flows",
    labelKey: "flows",
    icon: Workflow,
    module: ROUTE_MODULE["/flows"],
    beta: true,
  },
  {
    href: "/agents",
    labelKey: "aiAgents",
    icon: Bot,
    module: ROUTE_MODULE["/agents"],
  },
];

/** Hierarquia de campanha: Coordenador → Liderança → Apoiador. */
const campaignNavItems: NavItem[] = [
  {
    href: "/campaign/coordinators",
    labelKey: "coordinators",
    icon: UserRoundCog,
    module: ROUTE_MODULE["/campaign/coordinators"],
  },
  {
    href: "/campaign/leaderships",
    labelKey: "leaderships",
    icon: Users,
    module: ROUTE_MODULE["/campaign/leaderships"],
  },
  {
    href: "/campaign/supporters",
    labelKey: "supporters",
    icon: Handshake,
    module: ROUTE_MODULE["/campaign/supporters"],
  },
  {
    href: "/campaign/zones",
    labelKey: "zones",
    icon: MapPinned,
    module: "campaign.coordinators",
  },
];

const bottomNavItems = [
  { href: "/settings", labelKey: "settings", icon: Settings },
];

const platformNavItem = {
  href: "/platform",
  labelKey: "platform",
  icon: Building2,
};

interface SidebarProps {
  /** Controlled on mobile by the Header's hamburger button. Ignored on lg+. */
  open?: boolean;
  onClose?: () => void;
}

function SidebarTooltip({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        render={<span className="block w-full" />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const {
    profile,
    profileLoading,
    account,
    accountRole,
    signOut,
    canUseModule,
  } = useAuth();
  const totalUnread = useTotalUnread();
  const unreadNotifications = useUnreadNotifications();
  const showPlatform = isPlatformAdminEmail(profile?.email);

  const [collapsed, setCollapsed] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const rail = collapsed && desktop;

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const visibleWhatsappItems = useMemo(
    () => whatsappNavItems.filter((item) => canUseModule(item.module)),
    [canUseModule],
  );

  const visibleCampaignItems = useMemo(
    () => campaignNavItems.filter((item) => canUseModule(item.module)),
    [canUseModule],
  );

  const [leadershipScoped, setLeadershipScoped] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/campaign/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled && body?.scope === "leadership") {
          setLeadershipScoped(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile?.email]);

  const visibleCampaignNav = useMemo(
    () =>
      leadershipScoped
        ? visibleCampaignItems.filter(
            (item) =>
              item.href === "/campaign/supporters" ||
              item.href === "/campaign/leaderships",
          )
        : visibleCampaignItems,
    [visibleCampaignItems, leadershipScoped],
  );

  const whatsappChildActive = visibleWhatsappItems.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );

  const campaignChildActive = visibleCampaignNav.some(
    (item) => pathname === item.href || pathname.startsWith(item.href),
  );

  // Mantém o grupo aberto quando um filho está ativo.
  const [whatsappOpen, setWhatsappOpen] = useState(true);
  const [campaignOpen, setCampaignOpen] = useState(true);
  useEffect(() => {
    if (whatsappChildActive) setWhatsappOpen(true);
  }, [whatsappChildActive]);
  useEffect(() => {
    if (campaignChildActive) setCampaignOpen(true);
  }, [campaignChildActive]);

  const showAccountStrip =
    !profileLoading &&
    !!account?.name &&
    account.name !== profile?.full_name;

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const linkClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
      rail && "justify-center px-2",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  const renderNavLink = (
    item: { href: string; labelKey: string; icon: typeof LayoutDashboard; beta?: boolean },
    opts: {
      isActive: boolean;
      showUnreadDot?: boolean;
      showNotificationBadge?: boolean;
      nested?: boolean;
    },
  ) => {
    const label = t(item.labelKey as string);
    const content = (
      <Link href={item.href} className={linkClass(opts.isActive)} title={rail ? label : undefined}>
        <item.icon className="h-4 w-4 shrink-0" />
        {!rail ? (
          <>
            <span className="flex-1">{label}</span>
            {item.beta ? (
              <span
                aria-label={t("beta")}
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300"
              >
                {t("beta")}
              </span>
            ) : null}
            {opts.showUnreadDot ? (
              <span
                aria-label={t("unreadConversations", {
                  count: totalUnread,
                })}
                className="relative flex h-2 w-2"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            ) : null}
            {opts.showNotificationBadge ? (
              <span
                aria-label={t("unreadNotifications", {
                  count: unreadNotifications,
                })}
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
              >
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            ) : null}
          </>
        ) : (
          <>
            {opts.showUnreadDot ? (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            ) : null}
            {opts.showNotificationBadge ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold text-primary-foreground">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            ) : null}
          </>
        )}
      </Link>
    );

    return (
      <li key={item.href} className={cn(rail && "relative")}>
        <SidebarTooltip label={label} enabled={rail}>
          {content}
        </SidebarTooltip>
      </li>
    );
  };

  return (
    <TooltipProvider delay={200}>
      <button
        type="button"
        aria-label={t("closeMenu")}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-border bg-card",
          "w-64 transition-[width,transform] duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-0 lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-60",
        )}
        aria-label="Primary"
        data-collapsed={rail ? "true" : "false"}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center gap-2 border-b border-border",
            rail ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          {rail ? (
            <SidebarTooltip label={t("expand")} enabled>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={t("expand")}
                aria-expanded={false}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </SidebarTooltip>
          ) : (
            <>
              <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="truncate text-sm font-semibold text-foreground">
                  {t("title")}
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <SidebarTooltip label={t("collapse")} enabled={desktop}>
                  <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-label={t("collapse")}
                    aria-expanded
                    className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </SidebarTooltip>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("closeMenu")}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-4", rail ? "px-2" : "px-3")}>
          {/* Campanha */}
          {visibleCampaignNav.length > 0 ? (
            <div className="mb-2 flex flex-col gap-1">
              {!rail ? (
                <button
                  type="button"
                  onClick={() => setCampaignOpen((v) => !v)}
                  aria-expanded={campaignOpen}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                    campaignChildActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Vote className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{t("groupCampaign")}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      campaignOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </button>
              ) : null}

              {rail || campaignOpen ? (
                <ul
                  className={cn(
                    "flex flex-col gap-1",
                    !rail && "ml-2 border-l border-border pl-2",
                  )}
                >
                  {visibleCampaignNav.map((item) => {
                    const isActive =
                      pathname === item.href || pathname.startsWith(item.href);
                    return renderNavLink(item, { isActive });
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}

          {/* Suite WhatsApp */}
          {visibleWhatsappItems.length > 0 ? (
            <div className="flex flex-col gap-1">
              {!rail ? (
                <button
                  type="button"
                  onClick={() => setWhatsappOpen((v) => !v)}
                  aria-expanded={whatsappOpen}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                    whatsappChildActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{t("groupWhatsApp")}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      whatsappOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </button>
              ) : null}

              {rail || whatsappOpen ? (
                <ul
                  className={cn(
                    "flex flex-col gap-1",
                    !rail && "ml-2 border-l border-border pl-2",
                  )}
                >
                  {visibleWhatsappItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href));

                    return renderNavLink(item, {
                      isActive,
                      showUnreadDot:
                        item.href === "/inbox" && totalUnread > 0 && !isActive,
                      showNotificationBadge:
                        item.href === "/notifications" &&
                        unreadNotifications > 0,
                    });
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="my-4 border-t border-border" />

          <ul className="flex flex-col gap-1">
            {bottomNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return renderNavLink(item, { isActive });
            })}
            {showPlatform
              ? renderNavLink(platformNavItem, {
                  isActive: pathname.startsWith(platformNavItem.href),
                })
              : null}
          </ul>
        </nav>

        <div className={cn("shrink-0 border-t border-border", rail ? "p-2" : "p-3")}>
          {showAccountStrip && account?.name && !rail ? (
            <div className="mb-2 flex items-center gap-2 px-3 text-xs text-muted-foreground">
              <UsersRound className="size-3.5 shrink-0" />
              <span className="truncate" title={account.name}>
                {account.name}
              </span>
              {accountRole ? (
                (() => {
                  const meta = ROLE_CHIP[accountRole];
                  const Icon = meta.icon;
                  return (
                    <span
                      className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.className}`}
                    >
                      <Icon className="size-3" />
                      {t(meta.labelKey as string)}
                    </span>
                  );
                })()
              ) : null}
            </div>
          ) : null}
          <DropdownMenu>
            <SidebarTooltip
              label={profile?.full_name ?? t("defaultUser")}
              enabled={rail}
            >
              <DropdownMenuTrigger
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg py-2 text-left transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none data-popup-open:bg-muted/60",
                  rail ? "justify-center px-1" : "px-3",
                )}
              >
                <Avatar className="size-8 shrink-0">
                  {profile?.avatar_url ? (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.full_name ?? t("defaultAvatar")}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ??
                      profile?.email?.charAt(0)?.toUpperCase() ??
                      "U"}
                  </AvatarFallback>
                </Avatar>
                {!rail ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {profile?.full_name ?? t("defaultUser")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {profile?.email ?? ""}
                    </p>
                  </div>
                ) : null}
              </DropdownMenuTrigger>
            </SidebarTooltip>
            <DropdownMenuContent
              align={rail ? "start" : "end"}
              side="top"
              sideOffset={6}
              className="min-w-56 bg-popover text-popover-foreground ring-border"
            >
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <User className="size-4" />
                {t("menuProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <Settings className="size-4" />
                {t("menuSettings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="size-4" />
                {t("menuSignOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
