
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AsyncErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AsyncErrorBoundary caught an error:', error, errorInfo);
    
    // Handle specific async errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      console.error('Network error detected:', error);
    }
    
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      console.error('Chunk load error - possible code splitting issue:', error);
      // Auto-retry for chunk errors
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="m-4 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <span className="text-orange-700 font-medium">Loading Error</span>
            </div>
            <p className="text-orange-600 text-sm mb-3">
              Failed to load this section. This might be due to a network issue.
            </p>
            <Button onClick={this.handleRetry} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default AsyncErrorBoundary;
