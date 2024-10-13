import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ImageUpload from "./image";

const Upload = ({ onChange, value, children }) => {

  return <div className="flex gap-4">
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            Upload your files
          </DialogTitle>
          <DialogDescription className="text-center">
            The only file upload you will ever need
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ImageUpload onChange={onChange} />
        </div>
      </DialogContent>
    </Dialog>
  </div>
}

export default Upload;