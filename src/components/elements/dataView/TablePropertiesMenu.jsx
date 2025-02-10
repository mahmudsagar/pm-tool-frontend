import { EllipsisIcon, PlusIcon, EyeIcon, EyeOffIcon, ArrowLeftIcon, Trash2Icon, CopyIcon, CheckSquareIcon, ArrowUpIcon } from "lucide-react"
import { useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

export default function TablePropertiesMenu({ properties, setProperties }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newPropertyName, setNewPropertyName] = useState("")
  const [newPropertyType, setNewPropertyType] = useState("text")
  const [editingProperty, setEditingProperty] = useState(null)
  
  // Filter active properties (not deleted)
  const activeProperties = properties.filter(prop => !prop.deleted)
  
  // Filter deleted properties
  const deletedProperties = properties.filter(prop => prop.deleted)
  
  // Filter properties based on search term
  const filteredProperties = activeProperties.filter(prop => 
    prop.label.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Toggle property visibility
  const toggleVisibility = (propertyName, e) => {
    e.stopPropagation()
    setProperties(properties.map(prop => 
      prop.name === propertyName ? { ...prop, hidden: !prop.hidden } : prop
    ))
  }
  
  // Delete property (soft delete)
  const deleteProperty = (propertyName) => {
    setProperties(properties.map(prop => 
      prop.name === propertyName ? { ...prop, deleted: true } : prop
    ))
    setEditingProperty(null)
  }
  
  // Restore property
  const restoreProperty = (propertyName, e) => {
    e.stopPropagation()
    setProperties(properties.map(prop => 
      prop.name === propertyName ? { ...prop, deleted: false } : prop
    ))
  }
  
  // Permanently delete property
  const permanentlyDeleteProperty = (propertyName, e) => {
    e.stopPropagation()
    setProperties(properties.filter(prop => prop.name !== propertyName))
  }
  
  // Duplicate property
  const duplicateProperty = (property) => {
    const newProperty = {
      ...property,
      name: `${property.name}_copy`,
      label: `${property.label} (Copy)`,
      deleted: false,
      hidden: false
    }
    setProperties([...properties, newProperty])
    setEditingProperty(null)
  }
  
  // Add new property
  const addNewProperty = () => {
    if (!newPropertyName.trim()) return
    
    const newProperty = {
      type: newPropertyType,
      label: newPropertyName,
      name: newPropertyName.toLowerCase().replace(/\s+/g, '_'),
      deleted: false,
      hidden: false
    }
    
    setProperties([...properties, newProperty])
    setNewPropertyName("")
    setNewPropertyType("text")
    setIsDialogOpen(false)
  }

  // Edit property view
  const renderEditPropertyView = () => {
    const property = properties.find(p => p.name === editingProperty)
    if (!property) return null

    return (
      <>
        <div className="flex items-center gap-2 px-2 py-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setEditingProperty(null)}
          >
            <ArrowLeftIcon size={16} />
          </Button>
          <DropdownMenuLabel className="font-black">Edit property</DropdownMenuLabel>
        </div>
        <DropdownMenuSeparator />
        
        <div className="p-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
              {property.type === 'select' ? <CheckSquareIcon size={20} /> : '#'}
            </div>
            <Input 
              value={property.label}
              onChange={(e) => {
                setProperties(properties.map(p => 
                  p.name === property.name ? { ...p, label: e.target.value } : p
                ))
              }}
              className="h-10"
            />
          </div>
          
          <div className="mb-4">
            <DropdownMenuLabel className="text-sm mb-2 block">Type</DropdownMenuLabel>
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <CheckSquareIcon size={16} />
                {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
              </div>
              <ArrowUpIcon size={16} className="rotate-90" />
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowUpIcon size={16} className="rotate-180" />
              <span>Wrap in view</span>
            </div>
            <Switch checked={false} />
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <EyeOffIcon size={16} />
              <span>Hide in view</span>
            </div>
            <Switch 
              checked={property.hidden}
              onCheckedChange={(checked) => {
                setProperties(properties.map(p => 
                  p.name === property.name ? { ...p, hidden: checked } : p
                ))
              }}
            />
          </div>
          
          <DropdownMenuItem 
            className="w-full justify-start mb-2"
            onClick={() => duplicateProperty(property)}
          >
            <CopyIcon size={16} className="mr-2" />
            Duplicate property
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="w-full justify-start text-destructive"
            onClick={() => deleteProperty(property.name)}
          >
            <Trash2Icon size={16} className="mr-2" />
            Delete property
          </DropdownMenuItem>
        </div>
      </>
    )
  }

  // Main properties menu view
  const renderPropertiesMenuView = () => {
    return (
      <>
        <DropdownMenuLabel className="font-black">Properties</DropdownMenuLabel>
        <div className="px-2 py-1.5">
          <Input 
            placeholder="Search for a property..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
          />
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2">
            Shown in table
          </DropdownMenuLabel>
          {filteredProperties.filter(prop => !prop.hidden).map((property) => (
            <DropdownMenuItem 
              key={property.name} 
              className="py-1.5 px-2 cursor-default justify-between"
              onSelect={(e) => {
                e.preventDefault();
                setEditingProperty(property.name);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {property.type === 'select' ? '⊙' : '#'}
                </span>
                {property.label}
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => toggleVisibility(property.name, e)}
                >
                  <EyeIcon size={14} />
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
          
          {filteredProperties.some(prop => prop.hidden) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2">
                Hidden in table
              </DropdownMenuLabel>
              {filteredProperties.filter(prop => prop.hidden).map((property) => (
                <DropdownMenuItem 
                  key={property.name} 
                  className="py-1.5 px-2 cursor-default justify-between"
                  onSelect={(e) => {
                    e.preventDefault();
                    setEditingProperty(property.name);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {property.type === 'select' ? '⊙' : '#'}
                    </span>
                    {property.label}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={(e) => toggleVisibility(property.name, e)}
                    >
                      <EyeOffIcon size={14} />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="py-1.5 px-2 cursor-default">
              <PlusIcon className="mr-2 h-4 w-4" />
              New property
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add new property</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right">
                  Name
                </label>
                <Input
                  id="name"
                  value={newPropertyName}
                  onChange={(e) => setNewPropertyName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="type" className="text-right">
                  Type
                </label>
                <select
                  id="type"
                  value={newPropertyType}
                  onChange={(e) => setNewPropertyType(e.target.value)}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="text">Text</option>
                  <option value="select">Select</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={addNewProperty}>Add Property</Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {deletedProperties.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="py-1.5 px-2">
              <Trash2Icon className="mr-2 h-4 w-4" />
              Deleted properties
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="min-w-[220px]">
                {deletedProperties.map((property) => (
                  <DropdownMenuItem key={property.name} className="py-1.5 px-2 cursor-default justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {property.type === 'select' ? '⊙' : '#'}
                      </span>
                      {property.label}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={(e) => restoreProperty(property.name, e)}
                      >
                        <ArrowLeftIcon size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => permanentlyDeleteProperty(property.name, e)}
                      >
                        <Trash2Icon size={14} />
                      </Button>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        )}
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-8 h-8 p-0">
            <EllipsisIcon size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="end">
          {editingProperty ? renderEditPropertyView() : renderPropertiesMenuView()}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}