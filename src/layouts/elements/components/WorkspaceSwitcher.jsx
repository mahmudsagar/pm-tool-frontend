import { Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import useAuthStore from "@/stores/useAuthStore";

export default function WorkspaceSwitcher({ children }) {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useAuthStore();

  const handleSwitch = (ws) => {
    if (ws._id === currentWorkspace?._id) return;
    // Clears the previous workspace's cached data; queries refetch for the new one.
    setCurrentWorkspace(ws);
  };

  if (!workspaces?.length) return children;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-52 p-1">
        <ul className="flex flex-col">
          {workspaces.map((ws) => (
            <li key={ws._id}>
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-left"
                onClick={() => handleSwitch(ws)}
              >
                <span className="flex-1 truncate">{ws.name}</span>
                {currentWorkspace?._id === ws._id && (
                  <Check className="h-3 w-3 shrink-0 text-primary" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
