import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { LucideCommand, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import React, { useCallback, useEffect, useState } from "react";
import { useGlobalSearch } from "@/hooks/queries/useFilesQueries";
import publicIcon from '@/assets/images/public.svg';
import ShowIcon from "@/components/common/ShowIcon";

export function CommandMenu({ ...props }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, isFetching } = useGlobalSearch(debouncedSearch);
  const results = Object.entries(data?.all || {}).filter(([, list]) => list.length > 0);

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const down = (e) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return
        }
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = useCallback((command) => {
    setOpen(false)
    command()
  }, [])

  const groupKey = {
    folders: 'folder',
    pages: 'page',
    groups: 'group',
  }

  const handleSearchItemClick = (item) => {
    const { entity_type, page_type, _id } = item || {};
    if (entity_type === 'folder') {
      navigate(`/folder/${_id}`);
    } else if (entity_type === 'group') {
      navigate(`/group/${_id}`);
    } else if (entity_type === 'space') {
      navigate(`/space/${_id}`);
    } else if (entity_type === 'page' || entity_type === 'board') {
      if (page_type === 'scrum') {
        navigate(`/scrum/${_id}`);
      } else if (page_type === 'board' || entity_type === 'board') {
        navigate(`/board/${_id}`);
      } else {
        navigate(`/document/${_id}`);
      }
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-10 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none px-3.5 py-2.5"
        )}
        onClick={() => setOpen(true)}
        {...props}
      >
        <Search className="inline-flex mr-1.5 h-4 w-4 text-muted-foreground" />
        <span className="hidden md:inline-flex">Click to search...</span>
        <span className="inline-flex md:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-3.5 top-2.5 hidden h-5 select-none items-center gap-0.5 px-1.5 font-medium text-slate-500 dark:text-slate-400 sm:flex">
          <LucideCommand size={14} />
          <span className="text-xs text-[16px]">K</span>
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} commandProps={{ shouldFilter: false }}>
        <CommandInput placeholder="Type a command or search..." onValueChange={setSearchInput} value={searchInput} loading={isFetching}/>
        <CommandList>
          {results.length == 0 && <CommandEmpty>No results found.</CommandEmpty>}
          {results.map(([group, list], index) => {
            return (
              <React.Fragment key={group}>
                <CommandGroup heading={
                  <div className="flex items-center gap-2">
                    {["spaces", "teams"].includes(group) ?
                      <img
                        src={publicIcon}
                        alt="Space Icon"
                        width={20}
                      />
                      :
                      <>
                        {groupKey[group] ?
                          <ShowIcon file={groupKey[group]} />
                          :
                          null
                        }
                      </>
                    }
                    <h2 className="text-sm font-medium text-black dark:text-white"> {group.toUpperCase()}</h2>
                  </div>
                }>
                  {list.map((item, index) => {
                    const { title, name } = item || {};
                    const displayName = title || name;
                    return (
                      <CommandItem
                        key={index}
                        value={item?._id}
                        onSelect={() => {
                          runCommand(() => handleSearchItemClick(item))
                        }}
                      >
                        {displayName}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                {results.length != index && <CommandSeparator />}
              </React.Fragment>
            )
          })}

          {/* <CommandGroup heading="Links">
            {links
              .filter((navitem) => !navitem.external)
              .map((navItem) => (
                <CommandItem
                  key={navItem.href}
                  value={navItem.title}
                  onSelect={() => {
                    runCommand(() => navigate(navItem.href))
                  }}
                >
                  <FileIcon className="mr-2 h-4 w-4" />
                  {navItem.title}
                </CommandItem>
              ))}
          </CommandGroup> */}
          {/* {links.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((navItem) => (
                <CommandItem
                  key={navItem.href}
                  value={navItem.title}
                  onSelect={() => {
                    runCommand(() => navigate(navItem.href))
                  }}
                >
                  <div className="mr-2 flex h-4 w-4 items-center justify-center">
                    <CircleIcon className="h-3 w-3" />
                  </div>
                  {navItem.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))} */}
          {/* <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <SunIcon className="mr-2 h-4 w-4" />
              Light
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <MoonIcon className="mr-2 h-4 w-4" />
              Dark
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
              <LaptopIcon className="mr-2 h-4 w-4" />
              System
            </CommandItem>
          </CommandGroup> */}
        </CommandList>
      </CommandDialog>
    </>
  )
}
