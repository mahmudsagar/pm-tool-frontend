import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import React from 'react'

const MenuLoading = () => {
  return (
    <>
      { Array.from({ length: 2 }).map((_, index) => (
        <div key={index}>
          <div className="flex items-center gap-3 mb-3 mr-2">
            <Skeleton className="w-[25px] h-[22px] bg-slate-300" />
            <Skeleton className="w-full h-[25px] bg-slate-300" />
          </div>
          { Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2 mx-4 my-4">
                <Skeleton className="w-[25px] h-[22px] bg-slate-300" />
                <Skeleton className="w-full h-[25px] bg-slate-300" />
              </div>
            </div>
          ))}
          { index === 0 && <Separator className="my-4" /> }
        </div>
      ))}
    </>
  )
}

export default MenuLoading