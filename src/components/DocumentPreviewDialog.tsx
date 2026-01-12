import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import jsPDF from "jspdf";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  generatePdf: () => Promise<jsPDF>;
  filename: string;
}

const DocumentPreviewDialog = ({
  open,
  onOpenChange,
  title,
  generatePdf,
  filename,
}: DocumentPreviewDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [doc, setDoc] = useState<jsPDF | null>(null);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      generatePreview();
    } else {
      // Cleanup
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setDoc(null);
      setZoom(100);
      setError(null);
    }
  }, [open]);

  const generatePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const pdfDoc = await generatePdf();
      setDoc(pdfDoc);
      
      // Convert to blob URL for preview
      const blob = pdfDoc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err: any) {
      console.error("Error generating preview:", err);
      setError(err.message || "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (doc) {
      doc.save(filename);
      onOpenChange(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRegenerate = () => {
    generatePreview();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoom <= 50}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">{zoom}%</span>
              <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoom >= 200}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleRegenerate} disabled={loading}>
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-muted/50 p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating preview...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <X className="w-12 h-12 text-destructive" />
              <p className="text-destructive font-medium">Error generating preview</p>
              <p className="text-muted-foreground text-sm">{error}</p>
              <Button onClick={handleRegenerate} variant="outline">
                <RotateCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : pdfUrl ? (
            <div className="flex justify-center">
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                className="bg-white shadow-lg rounded-lg"
                style={{
                  width: `${zoom * 6}px`,
                  height: `${zoom * 8}px`,
                  maxWidth: "100%",
                  border: "none",
                }}
                title="Document Preview"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDownload} 
            disabled={loading || !doc}
            className="hero-gradient text-primary-foreground"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewDialog;
