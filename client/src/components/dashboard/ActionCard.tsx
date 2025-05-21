import React from 'react';
import { cn } from '@/lib/utils';

export interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  bgColor?: string;
  iconBgColor?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  title,
  subtitle,
  onClick,
  bgColor = 'bg-gray-50',
  iconBgColor = 'bg-primary/10'
}) => {
  return (
    <div 
      className={cn("rounded-xl p-3 text-center shadow-sm cursor-pointer", bgColor)} 
      onClick={onClick}
    >
      <div className={cn("h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-2", iconBgColor)}>
        {icon}
      </div>
      <span className="text-sm font-medium">{title}</span>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
};

export default ActionCard;
