import { Loader } from "lucide-react";

const ButtonLoading = ({ text, flex = 'row', btn = false }) => {
  return (
    <div className={`flex items-center justify-center flex-${flex} gap-2 py-5`}>
      <Loader className={`animate-spin text-black ${btn ? 'text-white dark:text-black' : 'dark:text-white'}`} />
      <p className={`text-sm text-black ${btn ? 'text-white dark:text-black' : 'dark:text-white'}`}>{text}</p>
    </div>
  )
}

export default ButtonLoading;