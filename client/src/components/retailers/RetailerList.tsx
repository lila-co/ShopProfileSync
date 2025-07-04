import React from 'react';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { cn } from './lib/utils';

interface RetailerProps {
  id: number;
  name: string;
  logoColor?: string;
}

interface RetailersProps {
  retailers: RetailerProps[];
  onRetailerSelect: (retailerId: number | null) => void;
  selectedRetailerId: number | null;
  showAll?: boolean;
}

export const Retailers: React.FC<RetailersProps> = ({ 
  retailers, 
  onRetailerSelect, 
  selectedRetailerId,
  showAll = false
}) => {
  // Get initial of retailer name for avatar fallback
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Get random color if logoColor not provided
  const getColor = (id: number, providedColor?: string) => {
    if (providedColor) return providedColor;
    
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
    ];
    
    return colors[id % colors.length];
  };

  return (
    <div className="flex flex-col space-y-2">
      {showAll && (
        <Button
          variant={selectedRetailerId === null ? "default" : "outline"}
          className="justify-start"
          onClick={() => onRetailerSelect(null)}
        >
          <Avatar className="h-6 w-6 mr-2 bg-gray-200">
            <AvatarFallback>
              All
            </AvatarFallback>
          </Avatar>
          All Stores
        </Button>
      )}
      
      {retailers.map((retailer) => (
        <Button
          key={retailer.id}
          variant={selectedRetailerId === retailer.id ? "default" : "outline"}
          className="justify-start"
          onClick={() => onRetailerSelect(retailer.id)}
        >
          <Avatar className={cn("h-6 w-6 mr-2", getColor(retailer.id, retailer.logoColor))}>
            <AvatarFallback>
              {getInitials(retailer.name)}
            </AvatarFallback>
          </Avatar>
          {retailer.name}
        </Button>
      ))}
    </div>
  );
};