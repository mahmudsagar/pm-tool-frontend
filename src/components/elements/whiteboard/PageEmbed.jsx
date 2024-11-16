import { useState } from "react"

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

import useDocumentStore from "@/stores/useDocumentStore"

export default function TaskEmbed({ onSelect }) {
  
  const [open, setOpen] = useState(false)
  // const [document, setSelectedDocument] = useState(null)

  const { documentData, loading } = useDocumentStore(state => state);

  if(loading.document) {
    return null
  }

  return (
    <div className="flex items-center space-x-4 ms-8">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" className="w-[150px] justify-start">
            + Insert Page Embed
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="top" align="start">
          {(documentData?.length > 0) ? (
            <Command>
              <CommandInput placeholder="Select Document..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {documentData?.map((document) => (
                    <CommandItem
                      key={document._id}
                      value={document._id}
                      keywords={document.pageMeta?.title.split(' ')}
                      className="cursor-pointer"
                      onSelect={(value) => {
                        onSelect(document._id)
                        console.log(value)
                        setOpen(false)
                      }}
                    >
                      {document.pageMeta?.title || '--'}
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