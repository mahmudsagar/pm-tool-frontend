import React from 'react'
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';

const MenuItemSkeleton = () => {
  return (
    <>
      <div className="flex items-center justify-center gap-2 flex-col">
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-[210px] h-8" />
        <Skeleton className="w-[210px] h-8" />
        <Skeleton className="w-[210px] h-8" />
        <Skeleton className="w-[210px] h-8" />
      </div>
      <Separator className="my-4" />
      <div className="flex items-center justify-center gap-2 flex-col">
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-[210px] h-8" />
        <Skeleton className="w-[210px] h-8" />
        <Skeleton className="w-[210px] h-8" />
        <Skeleton className="w-[210px] h-8" />
      </div>
    </>
  )
}

export default MenuItemSkeleton