import PageHead from "@/components/commons/PageHead";
import { ReactNode, useState } from "react";
import DashboardLayoutSidebar from "./DashboardLayoutSidebar";
import {
  SIDEBAR_ADMIN,
  SIDEBAR_GURU,
  SIDEBAR_MURID,
} from "./DashboardLayout.constants";
import { Navbar, NavbarMenuToggle } from "@nextui-org/react";

interface PropTypes {
  children: ReactNode;
  description?: string;
  title?: string;
  type?: string;
}

const DashboardLayout = (props: PropTypes) => {
  const { children, description, title, type = "admin" } = props;
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title={title} />
      <div className="max-w-screen-3xl 3xl:container flex">
        <DashboardLayoutSidebar
          sidebarItems={
            type === "admin"
              ? SIDEBAR_ADMIN
              : type === "guru"
                ? SIDEBAR_GURU
                : SIDEBAR_MURID
          }
          isOpen={open}
        />
        <div className="h-screen w-full overflow-y-auto p-4 pt-2 md:p-4 md:pt-0">
          <Navbar
            className="flex justify-between bg-transparent px-0 max-w-full"
            isBlurred={false}
            classNames={{wrapper: "p-0 max-w-full"}}
            position="static"
          >
            <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
            <div className="flex justify-end">
              <NavbarMenuToggle
                aria-label={open ? "Tutup Menu" : "Buka Menu"}
                onClick={() => setOpen(!open)}
                className="lg:hidden"
              />
            </div>
          </Navbar>
          <p className="mb-2 md:mb-2 text-small">{description}</p>
          {children}
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
