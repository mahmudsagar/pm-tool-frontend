import { Input } from "@/components/ui/input";


import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";



export default function ImageUpload({ onChange, children }) {
  const [filesToUpload, setFilesToUpload] = useState([]);
  // Latest onChange via ref: callers pass inline handlers, and re-running the
  // effect on a new handler identity would re-upload the same files.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (filesToUpload.length > 0) {
      onChangeRef.current(filesToUpload);
    }
  }, [filesToUpload]);


  const onDrop = useCallback(async (acceptedFiles) => {
    setFilesToUpload((prevUploadProgress) => {
      return [
        ...prevUploadProgress,
        ...acceptedFiles.map((file) => {
          return {
            progress: 0,
            File: file,
            source: null,
          };
        }),
      ];
    });
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (

    <div>
      <div
        {...getRootProps()}
      >
        {children}
      </div>

      <Input
        {...getInputProps()}
        id="dropzone-file"
        accept="image/png, image/jpeg"
        type="file"
        className="hidden"
      />
    </div>
  );
}