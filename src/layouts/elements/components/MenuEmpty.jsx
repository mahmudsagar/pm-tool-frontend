import React from 'react'
import { FolderOpen } from "lucide-react";

const MenuEmpty = () => {
  return (
    <div className="flex items-center justify-center flex-col gap-2 py-5">
      <FolderOpen className="dark:text-white" />
      <p className="text-sm dark:text-white">No folders available</p>
    </div>
  )
}

export default MenuEmpty;