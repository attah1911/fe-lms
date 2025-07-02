import React from "react";
import { Listbox, ListboxItem } from "@nextui-org/react";
import { useRouter } from "next/router";
import { cn } from "../../../../utils/cn";

interface SidebarItem {
  key: string;
  label: string;
  href: string;
  icon: JSX.Element;
}

interface SidebarNavProps {
  items: SidebarItem[];
}

const SidebarNav: React.FC<SidebarNavProps> = ({ items }) => {
  const router = useRouter();

  const handleNavigation = async (href: string) => {
    try {
      await router.push(href);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, href: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleNavigation(href);
    }
  };

  const isActive = (href: string) => {
    if (href.endsWith("/dashboard")) {
      const basePath = href.replace("/dashboard", "");
      return router.pathname === href || router.pathname === basePath;
    }
    return router.pathname === href;
  };

  return (
    <Listbox
      items={items}
      variant="solid"
      aria-label="Dashboard Menu"
    >
      {(item) => (
        <ListboxItem
          key={item.key}
          onClick={() => handleNavigation(item.href)}
          onKeyDown={(e) => handleKeyDown(e, item.href)}
          className={cn(
            "my-1 h-12 text-2xl cursor-pointer transition-colors",
            "hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-200",
            {
              "bg-primary-500 text-white": isActive(item.href)
            }
          )}
          startContent={item.icon}
          textValue={item.label}
          aria-labelledby={item.label}
          aria-describedby={item.label}
          role="button"
          tabIndex={0}
        >
          <p className="text-small">{item.label}</p>
        </ListboxItem>
      )}
    </Listbox>
  );
};

export default SidebarNav;
