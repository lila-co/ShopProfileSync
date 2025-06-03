
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const VoiceHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="mb-3 text-xs text-gray-600 hover:text-gray-800">
          <HelpCircle className="h-3 w-3 mr-1" />
          Voice Commands Help
          {isOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <Card className="bg-gray-50 border-gray-200 mb-4">
          <CardContent className="p-3">
            <h4 className="font-medium text-sm mb-2">Voice Command Examples</h4>
            
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-medium text-gray-700 mb-1">Adding Items:</p>
                <ul className="space-y-1 text-gray-600 ml-2">
                  <li>• "Add milk"</li>
                  <li>• "Add 2 pounds of chicken"</li>
                  <li>• "Add 1 gallon of orange juice"</li>
                  <li>• "Add 3 cans of tomatoes"</li>
                  <li>• "Get bread"</li>
                  <li>• "Buy 1 dozen eggs"</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-700 mb-1">Managing Items:</p>
                <ul className="space-y-1 text-gray-600 ml-2">
                  <li>• "Complete milk" (mark as done)</li>
                  <li>• "Check off bread"</li>
                  <li>• "Remove chicken"</li>
                  <li>• "Delete tomatoes"</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-700 mb-1">Supported Units:</p>
                <p className="text-gray-600 ml-2">
                  pounds, ounces, gallons, quarts, cups, liters, dozens, 
                  cans, bottles, boxes, bags, jars, loaves, bunches
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default VoiceHelp;
