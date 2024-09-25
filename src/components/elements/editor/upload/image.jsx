import { Input } from "@/components/ui/input";
import {
  AudioWaveform,
  File,
  FileImage,
  FolderArchive,
  UploadCloud,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";



const FileTypes = {
  Image: "image",
  Pdf: "pdf",
  Audio: "audio",
  Video: "video",
  Other: "other",
}

const ImageColor = {
  bgColor: "bg-purple-600",
  fillColor: "fill-purple-600",
};

const PdfColor = {
  bgColor: "bg-blue-400",
  fillColor: "fill-blue-400",
};

const AudioColor = {
  bgColor: "bg-yellow-400",
  fillColor: "fill-yellow-400",
};

const VideoColor = {
  bgColor: "bg-green-400",
  fillColor: "fill-green-400",
};

const OtherColor = {
  bgColor: "bg-gray-400",
  fillColor: "fill-gray-400",
};

export default function ImageUpload({ onChange, children }) {
  const [filesToUpload, setFilesToUpload] = useState([]);

  useEffect(() => {
    if (filesToUpload.length > 0) {
      onChange(filesToUpload);
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