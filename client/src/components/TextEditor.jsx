import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useLocation } from "react-router-dom";
import { templates } from "@/lib/templates";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

export default function TextEditor() {
  const [versions, setVersions] = useState([{ id: 1, content: "", timestamp: new Date() }]);
  const [currentVersionId, setCurrentVersionId] = useState(1);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeTab, setActiveTab] = useState("draw");
  const [signatureData, setSignatureData] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

  const editorRef = useRef(null);
  const canvasRef = useRef(null);
  const location = useLocation();
  const { formValues, category } = location.state || {};

  // Generate template based on category and form values
  const generateTemplate = (category, formValues) => {
    let template = templates[category] || "Template not found.";

    if (!formValues) return template;

    const placeholderRegex = /\[(.*?)\]/g;
    const matches = template.match(placeholderRegex) || [];

    const replacements = matches.reduce((acc, placeholder) => {
      const key = placeholder.slice(1, -1).toLowerCase().replace(/\s+/g, "_");
      if (formValues[key]) {
        acc[placeholder] = formValues[key];
      }
      return acc;
    }, {});

    Object.entries(replacements).forEach(([placeholder, value]) => {
      template = template.split(placeholder).join(value);
    });

    return template;
  };

  // Save the current content as a new version
  const saveVersion = () => {
    if (editorRef.current) {
      const newVersion = {
        id: versions.length + 1,
        content: editorRef.current.innerHTML,
        timestamp: new Date(),
      };
      setVersions([...versions, newVersion]);
      setCurrentVersionId(newVersion.id);
    }
  };

  // Switch to a specific version
  const switchVersion = (versionId) => {
    setCurrentVersionId(versionId);
    const selectedVersion = versions.find((v) => v.id === versionId);
    if (selectedVersion && editorRef.current) {
      editorRef.current.innerHTML = selectedVersion.content;
    }
  };

  // Download the content as a PDF
  const downloadAsPDF = () => {
    const input = editorRef.current;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("document.pdf");
    });
  };

  // Download the content as a DOCX file
  const downloadAsDoc = async () => {
    try {
      // Fetch your NDA template file
      const response = await fetch("/template.docx");
      const arrayBuffer = await response.arrayBuffer();
  
      // Load the template into PizZip
      const zip = new PizZip(arrayBuffer);
  
      // Create and load the docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        // Add HTML parser module config if needed
        modules: [
          // You might need to add an HTML module here if your content contains HTML formatting
        ]
      });
  
      // Get the content from the editor
      // Remove HTML tags and preserve only text content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = editorRef.current.innerHTML;
      const textContent = tempDiv.innerText;
  
      // Set up the data object
      const data = {
        mainContent: textContent  // Use a unique placeholder name
      };
  
      // Set the template data
      doc.setData(data);
  
      try {
        // Render the document
        doc.render();
      } catch (error) {
        console.error("Templating error:", error);
        if (error.properties && error.properties.errors) {
          console.log("Detailed error:", error.properties.errors);
        }
        throw error;
      }
  
      // Generate and save the document
      const blob = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE"
      });
  
      // Save with a meaningful filename
      saveAs(blob, "Document.docx");
    } catch (error) {
      console.error("Error generating DOCX file:", error);
    }
  };

  // Canvas drawing functions
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setIsDrawing(true);
    setLastX(x);
    setLastY(y);

    const ctx = canvas.getContext("2d");
    ctx.beginPath();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    setLastX(x);
    setLastY(y);
  };

  const endDrawing = () => setIsDrawing(false);
  const clearCanvas = () => canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

  // Insert signature into the editor
  const insertSignature = (dataUrl) => {
    if (editorRef.current && dataUrl) {
      const img = document.createElement("img");
      img.src = dataUrl;
      img.style.maxWidth = "200px";
      img.style.marginTop = "20px";
      editorRef.current.appendChild(img);
      setShowSignatureModal(false);
    }
  };

  // Handle file upload for signature
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSignatureData(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Load template when formValues or category changes
  useEffect(() => {
    if (formValues && category && editorRef.current) {
      const template = generateTemplate(category, formValues);
      editorRef.current.innerHTML = template;
      saveVersion(); // Save the initial content as the first version
    }
  }, [formValues, category]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg w-96">
            <div className="flex gap-2 mb-4">
              <Button
                variant={activeTab === "draw" ? "default" : "outline"}
                onClick={() => setActiveTab("draw")}
              >
                Draw
              </Button>
              <Button
                variant={activeTab === "upload" ? "default" : "outline"}
                onClick={() => setActiveTab("upload")}
              >
                Upload
              </Button>
            </div>

            {activeTab === "draw" ? (
              <div>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="border rounded"
                  onMouseDown={startDrawing}
                  onMouseUp={endDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={endDrawing}
                  onTouchMove={draw}
                />
                <div className="flex gap-2 mt-2">
                  <Button onClick={clearCanvas}>Clear</Button>
                  <Button onClick={() => insertSignature(canvasRef.current.toDataURL())}>
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setShowSignatureModal(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="mb-2"
                />
                {signatureData && (
                  <div className="mb-2">
                    <img
                      src={signatureData}
                      alt="Signature Preview"
                      className="max-w-[200px]"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => insertSignature(signatureData)}>
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setSignatureData(null)}>
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowSignatureModal(false)}
                  className="mt-2"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Interface */}
      <div className="flex flex-col md:flex-row h-screen max-w-full mx-auto p-4 gap-4">
        <div className="flex flex-col w-full md:w-1/2">
          <h1 className="text-2xl font-bold mb-4">Enhanced Version Control Text Editor</h1>
          <div
            ref={editorRef}
            contentEditable
            className="flex-grow p-4 border rounded overflow-auto whitespace-pre-wrap"
            style={{ minHeight: "200px" }}
          />
          <div className="flex gap-2 mt-4">
            <Button onClick={saveVersion}>Save Version</Button>
            <Button onClick={() => setShowSignatureModal(true)}>Add Signature</Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={downloadAsPDF}>
                    <FileDown className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download as PDF</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={downloadAsDoc}>
                    <FileDown className="h-4 w-4 mr-2" />
                    DOCX
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download as DOCX</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Version History */}
        <div className="w-full md:w-1/2 mt-4 md:mt-0">
          <h2 className="text-xl font-semibold mb-4">Versions</h2>
          <ScrollArea className="h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)]">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-2 mb-2 rounded cursor-pointer ${
                  version.id === currentVersionId ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
                onClick={() => switchVersion(version.id)}
              >
                <h3 className="font-medium">Version {version.id}</h3>
                <p className="text-sm">{version.timestamp.toLocaleString()}</p>
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}