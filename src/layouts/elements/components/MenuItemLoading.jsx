import React from 'react';
import { Loader } from "lucide-react";

const MenuItemLoading = ({ text, flex }) => {
  return (
    <div className={`flex items-center justify-center flex-${flex} gap-2 py-5`}>
      <Loader className="animate-spin text-gray-400 dark:text-white" />
      <p className="text-sm text-gray-400 dark:text-white">{text}</p>
    </div>
  )
}

export default MenuItemLoading;