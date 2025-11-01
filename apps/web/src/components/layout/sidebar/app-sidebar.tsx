import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Link } from '@tanstack/react-router';
import {
  LayoutDashboardIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
} from 'lucide-react';
import UserMenu from '@/features/auth/ui/components/user-menu';
import AdminMenu from '@/components/layout/sidebar/admin-menu';
import { useAuthenticatedUser } from '@/lib/auth-client';
import Logo from '@/components/logo';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
];
export default function AppSidebar() {
  const session = useAuthenticatedUser();
  const { open, toggleSidebar } = useSidebar();

  if (!session) {
    return null;
  }

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenuButton
          size='lg'
          onClick={toggleSidebar}
          className='relative flex w-full items-center group/trigger justify-start overflow-hidden'
        >
          {open ? (
            <>
              <Logo type='default' size={32} />
              <SidebarCloseIcon className='absolute z-10 right-2 top-1/2 -translate-y-1/2 !size-5 opacity-0 group-hover/trigger:opacity-100 transition-all' />
            </>
          ) : (
            <>
              <Logo
                type='icon'
                size={32}
                className='group-hover/trigger:opacity-0 transition-all'
              />

              <SidebarOpenIcon className=' absolute z-10 top-1/2 -translate-y-1/2 left-1/2 !size-5 -translate-x-1/2 opacity-0 group-hover/trigger:opacity-100 transition-all' />
            </>
          )}
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.to}
                      activeProps={{
                        className:
                          'bg-primary !text-primary-foreground hover:!bg-primary/90',
                      }}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {session.user.role === 'admin' && <AdminMenu />}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
