import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Upload, Link, FileText, Loader2 } from "lucide-react";
import { useToast } from "./hooks/use-toast";
import { apiRequest } from './lib/queryClient';

interface CircularUploadDialogProps {
  children: React.ReactNode;
}

const CircularUploadDialog: React.FC<CircularUploadDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [circularUrl, setCircularUrl] = useState('');
  const [retailerName, setRetailerName] = useState('');
  const [circularTitle, setCircularTitle] = useState('');
  const [activeTab, setActiveTab] = useState('image');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (data: { 
      type: 'image' | 'file' | 'url', 
      file?: File, 
      url?: string,
      retailerName: string,
      title: string 
    }) => {
      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('retailerName', data.retailerName);
      formData.append('title', data.title);

      if (data.file) {
        formData.append('file', data.file);
      }
      if (data.url) {
        formData.append('url', data.url);
      }

      const response = await fetch('/api/circulars/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Circular uploaded successfully. Extracted ${data.dealsCount} deals.`,
      });
      resetForm();
      setOpen(false);

      // Invalidate deals and retailers queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/retailers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload circular",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setSelectedFile(null);
    setCircularUrl('');
    setRetailerName('');
    setCircularTitle('');
    setActiveTab('image');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImageUpload = () => {
    if (!selectedFile || !retailerName || !circularTitle) {
      toast({
        title: "Missing Information",
        description: "Please select an image and fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    uploadMutation.mutate({
      type: 'image',
      file: selectedFile,
      retailerName,
      title: circularTitle
    });
  };

  const handleFileUpload = () => {
    if (!selectedFile || !retailerName || !circularTitle) {
      toast({
        title: "Missing Information",
        description: "Please select a file and fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    uploadMutation.mutate({
      type: 'file',
      file: selectedFile,
      retailerName,
      title: circularTitle
    });
  };

  const handleUrlUpload = () => {
    if (!circularUrl || !retailerName || !circularTitle) {
      toast({
        title: "Missing Information",
        description: "Please enter a URL and fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    uploadMutation.mutate({
      type: 'url',
      url: circularUrl,
      retailerName,
      title: circularTitle
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Weekly Circular</DialogTitle>
          <DialogDescription>
            Upload a weekly circular to automatically extract deals. Choose from image, PDF file, or web URL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="retailer-name">Retailer Name *</Label>
              <Input
                id="retailer-name"
                value={retailerName}
                onChange={(e) => setRetailerName(e.target.value)}
                placeholder="e.g. Target, Walmart"
              />
            </div>
            <div>
              <Label htmlFor="circular-title">Circular Title *</Label>
              <Input
                id="circular-title"
                value={circularTitle}
                onChange={(e) => setCircularTitle(e.target.value)}
                placeholder="e.g. Weekly Savings"
              />
            </div>
          </div>

          <Tabs defaultValue="image" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="image">
                <Upload className="h-4 w-4 mr-2" />
                Image
              </TabsTrigger>
              <TabsTrigger value="file">
                <FileText className="h-4 w-4 mr-2" />
                PDF File
              </TabsTrigger>
              <TabsTrigger value="url">
                <Link className="h-4 w-4 mr-2" />
                Web URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="space-y-4">
              <div>
                <Label htmlFor="image-upload">Upload Image</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supports JPG, PNG, WebP. We'll use OCR to extract deals.
                </p>
              </div>
              {selectedFile && (
                <div className="text-sm text-green-600">
                  Selected: {selectedFile.name}
                </div>
              )}
            </TabsContent>

            <TabsContent value="file" className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Upload PDF File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a PDF circular file. We'll extract text and images.
                </p>
              </div>
              {selectedFile && (
                <div className="text-sm text-green-600">
                  Selected: {selectedFile.name}
                </div>
              )}
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div>
                <Label htmlFor="circular-url">Circular URL</Label>
                <Input
                  id="circular-url"
                  type="url"
                  value={circularUrl}
                  onChange={(e) => setCircularUrl(e.target.value)}
                  placeholder="https://example.com/weekly-ad"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide a direct link to the online circular.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (activeTab === 'image') handleImageUpload();
              else if (activeTab === 'file') handleFileUpload();
              else if (activeTab === 'url') handleUrlUpload();
            }}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {uploadMutation.isPending ? 'Processing...' : 'Upload & Process'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CircularUploadDialog;