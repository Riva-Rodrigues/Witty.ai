import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Send, Archive, GraduationCap, CirclePlus, FileCode2, Mail } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { UserButton, useUser } from "@clerk/clerk-react";
import { ModeToggle } from "./ModeToggle";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const navItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Add Tasks", href: "/add-tasks", icon: CirclePlus },
  { name: "Create Docs", href: "/create", icon: FileCode2 },
  { name: "Check Email", href: "/email", icon: Mail },
  { name: "Roadmap", href: "/roadmap", icon: Archive },
  { name: "Scholarships", href: "/scholarship", icon: GraduationCap },
  { name: "ChatBot", href: "/chatbot", icon: Send },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useUser();

  const NavLinks = ({ onClick }) => (
    <div className="h-[calc(100vh-56px)] w-full flex flex-col justify-between">
      <nav className="space-y-3 py-4 w-full">
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex items-center gap-2 text-sm font-medium transition-colors hover:bg-[#E4E0E1] hover:text-[#AB886D] text-muted-foreground",
            location && location.pathname.includes(item.href) && "text-[#493628] bg-[#DCC0B3] hover:bg-[#F5F5DC] hover:text-[#2E1503]"
          )}
          onClick={onClick}
        >
          <div className="flex items-center gap-2 px-8 py-3 font-semibold text-base">
            <item.icon className="h-4 w-4" />
            {item.name}
          </div>
          <div
            className={cn(
              "ml-auto opacity-0 border-r-2 border-[#493628] h-11 transition-all",
              location && location.pathname.includes(item.href) && "opacity-100"
            )}
          />
        </Link>
        ))}
      </nav>
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <UserButton />
          {user && <span className="ml-2 text-sm text-muted-foreground">{user?.fullName}</span>}
        </div>
        <ModeToggle />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar for larger screens */}
      <aside className="w-64 flex-col border-r hidden lg:flex">
        <div className="flex h-14 items-center px-4">
          <Link to="/" className="flex items-center font-semibold">
            AspireEd
          </Link>
        </div>
        <ScrollArea className="flex-1">
          <NavLinks />
        </ScrollArea>
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0" aria-describedby="navigation-menu-description">
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden>
          <div id="navigation-menu-description" className="sr-only">
            Navigation menu for mobile devices, containing links to various sections of AspireEd
          </div>
          <div className="flex h-14 items-center border-b">
            <Link to="/" className="flex items-center font-semibold">
              AspireEd
            </Link>
          </div>
          <ScrollArea className="flex-1">
            <NavLinks />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
