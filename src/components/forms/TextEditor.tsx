import React, { useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import ImageResize from "quill-image-resize-module-react";
import "react-quill/dist/quill.snow.css";

const Parchment = Quill.import("parchment");

Quill.register("modules/imageResize", ImageResize);

let BaseImageFormat = Quill.import("formats/image");
const ImageFormatAttributesList = ["alt", "height", "width", "style"];
const COLORS = [
  "#000000",
  "#e60000",
  "#ff9900",
  "#ffff00",
  "#008a00",
  "#0066cc",
  "#9933ff",
  "#ffffff",
  "#facccc",
  "#ffebcc",
  "#ffffcc",
  "#cce8cc",
  "#cce0f5",
  "#ebd6ff",
  "#bbbbbb",
  "#f06666",
  "#ffc266",
  "#ffff66",
  "#66b966",
  "#66a3e0",
  "#c285ff",
  "#888888",
  "#a10000",
  "#b26b00",
  "#b2b200",
  "#006100",
  "#0047b2",
  "#6b24b2",
  "#444444",
  "#5c0000",
  "#663d00",
  "#666600",
  "#003700",
  "#002966",
  "#3d1466",
];

class ImageFormat extends BaseImageFormat {
  static formats(domNode: HTMLElement) {
    return ImageFormatAttributesList.reduce((formats: any, attribute) => {
      if (domNode.hasAttribute(attribute)) {
        formats[attribute] = domNode.getAttribute(attribute);
      }
      formats["max-width"] = "-webkit-fill-available";
      return formats;
    }, {});
  }

  format(name: string, value: any) {
    if (ImageFormatAttributesList.indexOf(name) > -1) {
      if (value) {
        this.domNode.setAttribute(name, value);
      } else {
        this.domNode.removeAttribute(name);
      }
    } else {
      super.format(name, value);
    }
  }
}

Quill.register(ImageFormat, true);

interface TextEditorProps {
  content: string;
  setContent: (content: string) => void;
  showImageAndLink?: boolean;
}

const TextEditor: React.FC<TextEditorProps> = ({
  content,
  setContent,
  showImageAndLink = true,
}) => {
  const quill = useRef<ReactQuill>(null);
  const ImageAndLink = showImageAndLink ? ["link", "image"] : [];

  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
      [{ align: "" }, { align: "center" }, { align: "right" }, { align: "justify" }],
      [{ color: COLORS }],
      ImageAndLink,
    ],
    imageResize: {
      parchment: Quill.import("parchment"),
      handleStyles: {
        backgroundColor: "black",
        border: "none",
        color: "white",
      },
      modules: ["Resize", "DisplaySize", "Toolbar"],
    },
  };

  const handleChange = (value: string) => {
    setContent(value);
  };

  return (
    <ReactQuill
      placeholder="내용을 입력해 주세요."
      ref={quill}
      value={content}
      modules={modules}
      onChange={handleChange}
    />
  );
};

export default TextEditor;
