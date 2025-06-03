
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import VoiceHelp from './VoiceHelp';

interface VoiceAgentProps {
  onAddItem: (itemName: string, quantity: number, unit: string) => void;
  onToggleItem?: (itemName: string) => void;
  onDeleteItem?: (itemName: string) => void;
  isProcessing?: boolean;
}

interface VoiceRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => VoiceRecognition;
    SpeechRecognition: new () => VoiceRecognition;
  }
}

const VoiceAgent: React.FC<VoiceAgentProps> = ({ 
  onAddItem, 
  onToggleItem, 
  onDeleteItem, 
  isProcessing = false 
}) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && window.speechSynthesis) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
      }
    } else {
      setIsSupported(false);
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Text-to-speech function
  const speak = useCallback((text: string) => {
    if (!speechEnabled || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [speechEnabled]);

  // Parse voice commands
  const parseVoiceCommand = useCallback((command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    
    // Add item commands
    const addPatterns = [
      /add (\d+(?:\.\d+)?)\s*((?:pounds?|lbs?|ounces?|oz|gallons?|quarts?|pints?|cups?|liters?|ml|dozens?|count|loaves?|bags?|boxes?|bottles?|cans?|jars?|packs?|containers?|bunches?|heads?|blocks?))?\s*(?:of\s+)?(.+)/i,
      /add (.+?)(?:\s+(\d+(?:\.\d+)?)\s*((?:pounds?|lbs?|ounces?|oz|gallons?|quarts?|pints?|cups?|liters?|ml|dozens?|count|loaves?|bags?|boxes?|bottles?|cans?|jars?|packs?|containers?|bunches?|heads?|blocks?)))?/i,
      /(\d+(?:\.\d+)?)\s*((?:pounds?|lbs?|ounces?|oz|gallons?|quarts?|pints?|cups?|liters?|ml|dozens?|count|loaves?|bags?|boxes?|bottles?|cans?|jars?|packs?|containers?|bunches?|heads?|blocks?))?\s*(?:of\s+)?(.+)/i
    ];

    for (const pattern of addPatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        let quantity = 1;
        let unit = 'COUNT';
        let itemName = '';

        if (pattern === addPatterns[0]) {
          // Pattern: "add 2 pounds of chicken"
          quantity = parseFloat(match[1]);
          unit = normalizeUnit(match[2] || 'count');
          itemName = match[3].trim();
        } else if (pattern === addPatterns[1]) {
          // Pattern: "add milk 1 gallon" or "add milk"
          itemName = match[1].trim();
          quantity = match[2] ? parseFloat(match[2]) : 1;
          unit = normalizeUnit(match[3] || 'count');
        } else if (pattern === addPatterns[2]) {
          // Pattern: "2 pounds chicken"
          quantity = parseFloat(match[1]);
          unit = normalizeUnit(match[2] || 'count');
          itemName = match[3].trim();
        }

        if (itemName && !isNaN(quantity)) {
          return {
            action: 'add',
            itemName: capitalizeWords(itemName),
            quantity,
            unit: unit.toUpperCase()
          };
        }
      }
    }

    // Simple add without quantity
    const simpleAdd = lowerCommand.match(/(?:add|get|buy)\s+(.+)/i);
    if (simpleAdd) {
      return {
        action: 'add',
        itemName: capitalizeWords(simpleAdd[1].trim()),
        quantity: 1,
        unit: 'COUNT'
      };
    }

    // Toggle/complete item commands
    if (lowerCommand.includes('complete') || lowerCommand.includes('check off') || lowerCommand.includes('mark')) {
      const item = lowerCommand.replace(/(complete|check off|mark|done)\s*/i, '').trim();
      if (item && onToggleItem) {
        return { action: 'toggle', itemName: capitalizeWords(item) };
      }
    }

    // Delete item commands
    if (lowerCommand.includes('remove') || lowerCommand.includes('delete')) {
      const item = lowerCommand.replace(/(remove|delete)\s*/i, '').trim();
      if (item && onDeleteItem) {
        return { action: 'delete', itemName: capitalizeWords(item) };
      }
    }

    return null;
  }, [onToggleItem, onDeleteItem]);

  // Normalize units
  const normalizeUnit = (unit: string): string => {
    const unitMap: Record<string, string> = {
      'pound': 'LB', 'pounds': 'LB', 'lb': 'LB', 'lbs': 'LB',
      'ounce': 'OZ', 'ounces': 'OZ', 'oz': 'OZ',
      'gallon': 'GALLON', 'gallons': 'GALLON',
      'quart': 'QUART', 'quarts': 'QUART',
      'pint': 'PINT', 'pints': 'PINT',
      'cup': 'CUP', 'cups': 'CUP',
      'liter': 'LITER', 'liters': 'LITER',
      'milliliter': 'ML', 'milliliters': 'ML', 'ml': 'ML',
      'dozen': 'DOZEN', 'dozens': 'DOZEN',
      'loaf': 'LOAF', 'loaves': 'LOAF',
      'bag': 'BAG', 'bags': 'BAG',
      'box': 'BOX', 'boxes': 'BOX',
      'bottle': 'BOTTLE', 'bottles': 'BOTTLE',
      'can': 'CAN', 'cans': 'CAN',
      'jar': 'JAR', 'jars': 'JAR',
      'pack': 'PACK', 'packs': 'PACK',
      'container': 'CONTAINER', 'containers': 'CONTAINER',
      'bunch': 'BUNCH', 'bunches': 'BUNCH',
      'head': 'HEAD', 'heads': 'HEAD',
      'block': 'BLOCK', 'blocks': 'BLOCK'
    };
    
    return unitMap[unit.toLowerCase()] || 'COUNT';
  };

  // Capitalize words
  const capitalizeWords = (str: string): string => {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Process voice command
  const processVoiceCommand = useCallback(async (command: string) => {
    setIsProcessingVoice(true);
    
    try {
      const parsedCommand = parseVoiceCommand(command);
      
      if (parsedCommand) {
        switch (parsedCommand.action) {
          case 'add':
            await onAddItem(parsedCommand.itemName, parsedCommand.quantity, parsedCommand.unit);
            speak(`Added ${parsedCommand.quantity} ${parsedCommand.unit.toLowerCase()} of ${parsedCommand.itemName} to your shopping list`);
            break;
          case 'toggle':
            if (onToggleItem) {
              onToggleItem(parsedCommand.itemName);
              speak(`Marked ${parsedCommand.itemName} as completed`);
            }
            break;
          case 'delete':
            if (onDeleteItem) {
              onDeleteItem(parsedCommand.itemName);
              speak(`Removed ${parsedCommand.itemName} from your shopping list`);
            }
            break;
        }
      } else {
        speak("I didn't understand that command. Try saying 'add milk' or 'add 2 pounds of chicken'");
        toast({
          title: "Command Not Recognized",
          description: "Try saying 'add [item]' or 'add [quantity] [unit] of [item]'",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      speak("Sorry, I had trouble processing that command");
      toast({
        title: "Error",
        description: "Failed to process voice command",
        variant: "destructive"
      });
    } finally {
      setIsProcessingVoice(false);
    }
  }, [parseVoiceCommand, onAddItem, onToggleItem, onDeleteItem, speak, toast]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    setIsListening(true);
    setTranscript('');
    
    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript + interimTranscript);

      if (finalTranscript) {
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Process the final command
        processVoiceCommand(finalTranscript);
        setIsListening(false);
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event);
      setIsListening(false);
      toast({
        title: "Voice Recognition Error",
        description: "Please try again",
        variant: "destructive"
      });
    };

    try {
      recognitionRef.current.start();
      speak("I'm listening. What would you like to add to your shopping list?");
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
    }
  }, [isListening, processVoiceCommand, speak, toast]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [isListening]);

  // Toggle speech
  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled);
    if (!speechEnabled) {
      speak("Voice feedback enabled");
    } else {
      window.speechSynthesis.cancel();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, [isListening]);

  if (!isSupported) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4 text-center">
          <p className="text-gray-600">Voice features not supported in this browser</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Assistant
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSpeech}
            className="h-8 w-8 p-0"
          >
            {speechEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing || isProcessingVoice}
            className={`flex items-center gap-2 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isProcessingVoice ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {isProcessingVoice ? 'Processing...' : isListening ? 'Stop' : 'Start Voice'}
          </Button>

          {(isListening || isSpeaking) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {isListening ? (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              ) : (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
              {isListening ? 'Listening...' : 'Speaking...'}
            </div>
          )}
        </div>

        {transcript && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-gray-600 mb-1">You said:</p>
            <p className="font-medium">{transcript}</p>
          </div>
        )}

        <VoiceHelp />
      </CardContent>
    </Card>
  );
};

export default VoiceAgent;
