import React from 'react';
import { cn } from '@/lib/utils';

export interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'primary';
}

export default function ActionCard({ 
  title, 
  description, 
  icon, 
  action, 
  variant = 'default' 
}: ActionCardProps) {
  return (
    <Card className="card-modern cursor-pointer glass-shimmer" onClick={action}>
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "glass-button p-2 rounded-lg",
            variant === 'primary' ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          )}>
            {icon}
          </div>
          <div>
            <CardTitle className="text-heading-md">{title}</CardTitle>
            <CardDescription className="text-body-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}