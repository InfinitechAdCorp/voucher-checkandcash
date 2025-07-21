"use client"

import type * as React from "react"
import { usePathname } from "next/navigation"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/toaster" // Import Toaster here

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Define paths where the sidebar should NOT be shown
  const noSidebarPaths = ["/login", "/sign-up"]
  const showSidebar = !noSidebarPaths.includes(pathname)

  return (
    <SidebarProvider>
      {showSidebar && <AppSidebar />}
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-4 bg-white">
          {showSidebar && <SidebarTrigger className="-ml-1" />}
          {showSidebar && <Separator orientation="vertical" className="mr-2 h-4" />}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">ABIC Accounting System</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 bg-slate-50">{children}</div>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  )
}
