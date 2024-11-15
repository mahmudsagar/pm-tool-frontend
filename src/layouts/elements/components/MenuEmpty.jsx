import React from 'react'
import { FolderOpen } from "lucide-react";

const MenuEmpty = () => {
  return (
    <div className="flex items-center justify-center flex-col gap-2 py-5">
      <FolderOpen className="text-gray-400 dark:text-white" />
      <p className="text-sm text-gray-400 dark:text-white">No folders available</p>
    </div>
  )
}

export default MenuEmpty;