"use client";

import * as React from "react";
import { IconBuildingCommunity, IconCalendarEvent, IconCalendarStats, IconChartBar, IconDashboard, IconFolder, IconInnerShadowTop, IconListCheck, IconTrophy, IconUsers } from "@tabler/icons-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "User",
    url: "/dashboard/users",
    icon: IconUsers,
  },
  {
    title: "Periode",
    url: "/dashboard/periods",
    icon: IconCalendarStats,
  },
  {
    title: "Divisi",
    url: "/dashboard/divisions",
    icon: IconBuildingCommunity,
  },
  {
    title: "Proker",
    url: "/dashboard/prokers",
    icon: IconFolder,
  },
  {
    title: "Event",
    url: "/dashboard/events",
    icon: IconCalendarEvent,
  },
  {
    title: "Indikator",
    url: "/dashboard/indicators",
    icon: IconListCheck,
  },
  {
    title: "Hasil/Laporan",
    url: "/dashboard/results",
    icon: IconChartBar,
  },
  {
    title: "Ranking Bulanan",
    url: "/dashboard/monthly-rank",
    icon: IconTrophy,
  },
];

type SidebarUser = {
  name: string;
  email?: string | null;
  avatar?: string | null;
};

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: SidebarUser }) {
  const resolvedUser: SidebarUser = user ?? {
    name: "User",
    email: "",
    avatar: null,
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5">
              <a href="#">
                <IconInnerShadowTop className="size-5" />
                <span className="text-base font-semibold">Website Penilaian HMIF</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator className="mx-2" />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={resolvedUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
