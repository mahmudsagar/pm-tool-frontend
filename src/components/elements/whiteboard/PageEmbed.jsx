import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import useApi from "@/lib/dataFetcher"
import { documentBaseUrl } from "@/utils/constants"
import { useAuth } from "@/contexts/AuthContext"

export default function TaskEmbed({ onSelect }) {
  const [open, setOpen] = useState(false)
  const { data, loading, error, callApi } = useApi(state => state);

  const {user} = useAuth();
  
  useEffect(() => {
    callApi(documentBaseUrl + '?user_id=' + user.id)
  }, [user.id])

  if(loading || error) {
    return null;
  }

  return (
    <div className="flex items-center space-x-4 ms-8">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" className="w-[150px] justify-start">
            + Embed Page
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="top" align="start">
          {(data?.length > 0) ? (
            <Command>
              <CommandInput placeholder="Select Document..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {data?.map((document) => (
                    <CommandItem
                      key={document._id}
                      value={document._id}
                      keywords={document?.title.split(' ')}
                      className="cursor-pointer"
                      onSelect={(value) => {
                        onSelect(document._id)
                        console.log(value)
                        setOpen(false)
                      }}
                    >
                      {document?.title || '--'}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <p className="px-4 py-2 text-sm">No page found</p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}