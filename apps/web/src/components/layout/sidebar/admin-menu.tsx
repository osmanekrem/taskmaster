import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link } from '@tanstack/react-router';
import { SettingsIcon, UsersIcon } from 'lucide-react';

const links = [
  { to: '/user-management', label: 'Kullanıcı Yönetimi', icon: UsersIcon },
  { to: '/admin-settings', label: 'Ayarlar', icon: SettingsIcon },
];

export default function AdminMenu() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Admin</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {links.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton asChild>
                <Link to={item.to}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
