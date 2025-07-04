import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { extractTextFromReceiptImage } from './lib/openai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './lib/queryClient';
import { useToast } from './hooks/use-toast';

const ReceiptScanner: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const scanReceiptMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      // First extract text from the image
      const extractedData = await extractTextFromReceiptImage(base64Image);
      
      // Then save the receipt data
      const response = await apiRequest('POST', '/api/receipts', {
        receiptImage: base64Image,
        receiptData: extractedData
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Receipt scanned successfully",
        description: "Your purchase data has been extracted and saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/insights/top-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights/monthly-spending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      navigate('/');
    },
    onError: (error) => {
      toast({
        title: "Error scanning receipt",
        description: error.message || "There was an error processing your receipt. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      setPreviewUrl(base64Image);
      scanReceiptMutation.mutate(base64Image.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async () => {
    try {
      if (isCapturing) {
        // Stop capturing and take a photo
        if (videoRef.current) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          
          context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPreviewUrl(imageDataUrl);
          
          // Stop the camera stream
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          
          setIsCapturing(false);
          
          // Process the image
          scanReceiptMutation.mutate(imageDataUrl.split(',')[1]);
        }
      } else {
        // Start camera with environment (back) camera preference for better receipt scanning
        const constraints = {
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        
        setIsCapturing(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions or try uploading a photo instead.",
        variant: "destructive"
      });
      console.error("Camera error:", error);
    }
  };

  const handleClose = () => {
    // If camera is active, stop it before navigating away
    if (isCapturing && videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-white p-4 z-20">
      <div className="flex justify-between items-center mb-4">
        <button 
          className="text-gray-600" 
          onClick={handleClose}
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M5 12h14"/>
          </svg>
        </button>
        <h2 className="text-lg font-bold">Scan Receipt</h2>
        <div className="w-8"></div>
      </div>
      
      <div className="bg-gray-100 rounded-xl h-80 flex flex-col items-center justify-center mb-4 overflow-hidden relative">
        {isCapturing ? (
          <>
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover"
              playsInline
              autoPlay
            />
            {/* Receipt frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white border-dashed w-4/5 h-4/5 rounded-lg flex items-center justify-center">
                <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                  Position receipt within frame
                </div>
              </div>
            </div>
          </>
        ) : previewUrl ? (
          <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-contain" />
        ) : (
          <div className="text-gray-400 text-center p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
            <p className="font-medium text-gray-600 mb-1">Take a photo of your receipt</p>
            <p className="text-sm text-gray-500">Position the receipt clearly in good lighting</p>
            <p className="text-xs text-gray-400 mt-2">Make sure all text is readable and the receipt is flat</p>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <Button
          className="w-full py-3 bg-primary text-white rounded-lg font-medium"
          onClick={handleCameraCapture}
          disabled={scanReceiptMutation.isPending}
        >
          {isCapturing ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
              Capture Receipt Photo
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
              Take Photo of Receipt
            </>
          )}
        </Button>
        
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        
        <Button
          className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanReceiptMutation.isPending || isCapturing}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          Upload Existing Photo
        </Button>
        
        {scanReceiptMutation.isPending && (
          <Card className="p-3 mt-3 bg-yellow-50 border-yellow-200">
            <p className="text-center text-yellow-700">
              Processing receipt... This may take a moment.
            </p>
          </Card>
        )}
        
        <SafeComponent name="RecentlyScanned">
          <div className="text-center mt-4">
            <h3 className="font-medium text-gray-700 mb-2">Recently Scanned</h3>
            <div className="flex justify-center space-x-3">
              {/* This would be populated with recent receipts from the backend */}
              <div className="w-16 h-24 bg-gray-200 rounded-lg"></div>
              <div className="w-16 h-24 bg-gray-200 rounded-lg"></div>
              <div className="w-16 h-24 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </SafeComponent>
      </div>
    </div>
  );
};

export default ReceiptScanner;
