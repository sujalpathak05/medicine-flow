import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Branch = Tables<"branches">;

interface PdfUploadButtonProps {
  branches: Branch[];
  onSuccess: () => void;
}

export function PdfUploadButton({ branches, onSuccess }: PdfUploadButtonProps) {
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number; inserted: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    // Read as text - basic extraction for structured PDFs
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert PDF bytes to string, extracting readable text
    let text = "";
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const rawText = decoder.decode(uint8Array);
    
    // Extract text between BT and ET markers (PDF text objects)
    const textMatches = rawText.match(/\((.*?)\)/g);
    if (textMatches) {
      text = textMatches
        .map(m => m.slice(1, -1))
        .filter(t => t.length > 1 && /[a-zA-Z0-9]/.test(t))
        .join(" ");
    }
    
    // If that didn't work well, just send the raw readable parts
    if (text.length < 100) {
      text = rawText.replace(/[^\x20-\x7E\n\r]/g, " ").replace(/\s+/g, " ").trim();
    }
    
    return text.substring(0, 10000);
  };

  const handleUpload = async () => {
    if (!file || !branchId) {
      toast.error("PDF file और branch दोनों select करें");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const pdfText = await extractTextFromPdf(file);
      
      const { data, error } = await supabase.functions.invoke("parse-medicine-pdf", {
        body: { pdfText, branchId },
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
      } else {
        setResult({ total: data.total, inserted: data.inserted });
        toast.success(`${data.inserted} medicines successfully added!`);
        onSuccess();
      }
    } catch (err: any) {
      toast.error("PDF upload failed: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setBranchId("");
    setResult(null);
  };

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setOpen(true); }}>
        <Upload className="h-4 w-4 mr-2" />
        PDF Upload
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">📄 PDF से Medicine Load करें</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-lg font-semibold">{result.inserted} medicines added!</p>
              <p className="text-sm text-muted-foreground">Total found: {result.total}</p>
              <Button onClick={() => { setOpen(false); reset(); }}>Close</Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Branch Select करें *</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger><SelectValue placeholder="Branch choose करें" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>PDF File *</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to select PDF</p>
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleUpload} disabled={loading || !file || !branchId} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    AI Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Load Medicines
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                AI automatically detect करेगा medicine names, categories और quantities
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
