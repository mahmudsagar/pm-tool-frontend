import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { LucideCommand, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import React, { useCallback, useEffect, useState } from "react";
import { debounce } from "@/utils/helper";
import useApi from "@/lib/dataFetcher";
import { searchEndpoint } from "@/utils/constants";
import publicIcon from '@/assets/images/public.svg';
import ShowIcon from "@/components/common/ShowIcon";

// const links = [
//   {
//     title: "Documentation",
//     href: "#",
//   },
//   {
//     title: "Components",
//     href: "#",
//   },
//   {
//     title: "Blocks",
//     href: "#",
//   },
//   {
//     title: "Charts",
//     href: "#",
//   },
//   {
//     title: "Themes",
//     href: "#",
//   },
//   {
//     title: "Examples",
//     href: "#",
//   },
//   {
//     title: "Colors",
//     href: "#",
//   },
// ]

export function CommandMenu({ ...props }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { loading, data, callApi, error } = useApi();
  const [searchInput,setSearchInput] = useState('');
  const results = Object.entries(data?.all || {});

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

  const handleGlobalSearch = (value) => {
    setSearchInput(value)
    const debouncedCallApi = debounce(() => {
      console.log(searchEndpoint + `?query=${value}`);
      let url = searchEndpoint;
      if (value) {
        url += `?query=${value}`
      }
      callApi(url)
    }, 500);
    debouncedCallApi();
  }

  const groupKey = {
    folders: 'folder',
    pages: 'page',
    groups: 'group',
  }


  const handleSearchItemClick = (item) => {
    console.log(item);
    const { entity_type, _id } = item || {};
    if (['folder', 'group',].includes(entity_type)) {
      navigate(`/?folderId=${_id}`);
    } else if (['team', 'space'].includes(entity_type)) {
      navigate(`/?spaceId=${_id}`);
    } else if (entity_type == 'page') {
      navigate(`/document/${_id}`);
    } else {
      // console.log(item, 'item click');
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
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." onValueChange={handleGlobalSearch}  value={searchInput} loading={loading}/>
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
                        value={displayName}
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
