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
                  <li>• "Add milk to my list"</li>
                  <li>• "I need 2 pounds of chicken"</li>
                  <li>• "Put 1 gallon of orange juice on there"</li>
                  <li>• "Add 3 cans of tomatoes please"</li>
                  <li>• "Don't forget bread"</li>
                  <li>• "I need a dozen eggs"</li>
                  <li>• "Can you add some bananas?"</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-700 mb-1">Conversational Queries:</p>
                <ul className="space-y-1 text-gray-600 ml-2">
                  <li>• "What should I cook tonight?"</li>
                  <li>• "Help me plan meals for the week"</li>
                  <li>• "What goes well with chicken?"</li>
                  <li>• "I want to make pasta, what do I need?"</li>
                  <li>• "Suggest a healthy recipe"</li>
                  <li>• "What ingredients make a good salad?"</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-700 mb-1">Managing List:</p>
                <ul className="space-y-1 text-gray-600 ml-2">
                  <li>• "I got the milk" (mark complete)</li>
                  <li>• "Remove tomatoes from my list"</li>
                  <li>• "Check off bread"</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-700 mb-1">Recipe & Cooking Help:</p>
                <ul className="space-y-1 text-gray-600 ml-2">
                  <li>• "Give me a chicken recipe"</li>
                  <li>• "How do I make pasta?"</li>
                  <li>• "Suggest a soup recipe"</li>
                  <li>• "What's a good salad recipe?"</li>
                  <li>• "How do I cook rice?"</li>
                  <li>• "What can I make for dinner?"</li>
                </ul>
              </div>

              <div className="mt-2 p-2 bg-blue-50 rounded">
                <p className="text-blue-700 font-medium text-xs">💡 Pro Tip:</p>
                <p className="text-blue-600 text-xs">I'm powered by AI and listen continuously! Have natural conversations about cooking, ask for recipe ideas, or get meal planning help. Just talk to me like you would a friend - I'll keep listening until you tell me to stop!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default VoiceHelp;