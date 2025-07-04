
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from './hooks/use-toast';
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
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && window.speechSynthesis) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
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
    utterance.rate = 0.9; // Slightly slower for more natural speech
    utterance.pitch = 1.1; // Slightly higher pitch for friendliness
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
    
    // Enhanced conversational query detection
    const conversationalKeywords = ['recipe', 'cook', 'make', 'meal', 'plan', 'what', 'how', 'help', 'suggest', 'why', 'when', 'where', 'should', 'can', 'could', 'would', 'do you', 'tell me', 'explain'];
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'should', 'can', 'could', 'would', 'do you', 'will you', 'are you'];
    
    // Check if it's a question (ends with ? or starts with question words)
    const isQuestion = lowerCommand.endsWith('?') || 
                      questionWords.some(word => lowerCommand.startsWith(word + ' '));
    
    // Check for conversational keywords without explicit add commands
    const hasConversationalKeywords = conversationalKeywords.some(keyword => lowerCommand.includes(keyword));
    
    // Don't treat as add command if it's clearly conversational
    const hasAddKeywords = lowerCommand.match(/(?:add|get|buy|put|need|want)/i);
    
    if (isQuestion || (hasConversationalKeywords && !hasAddKeywords)) {
      return { action: 'conversation', query: command };
    }
    
    // Add item commands
    const addPatterns = [
      /add (\d+(?:\.\d+)?)\s*((?:pounds?|lbs?|ounces?|oz|gallons?|quarts?|pints?|cups?|liters?|ml|dozens?|count|loaves?|bags?|boxes?|bottles?|cans?|jars?|packs?|containers?|bunches?|heads?|blocks?))?\s*(?:of\s+)?(.+)/i,
      /add (.+?)(?:\s+(\d+(?:\.\d+)?)\s*((?:pounds?|lbs?|ounces?|oz|gallons?|quarts?|pints?|cups?|liters?|ml|dozens?|count|loaves?|bags?|boxes?|bottles?|cans?|jars?|packs?|containers?|bunches?|heads?|blocks?)))?/i,
      /(\d+(?:\.\d+)?)\s*((?:pounds?|lbs?|ounces?|oz|gallons?|quarts?|pints?|cups?|liters?|ml|dozens?|count|loaves?|bags?|boxes?|bottles?|cans?|jars?|packs?|containers?|bunches?|heads?|blocks?))?\s*(?:of\s+)?(.+)/i,
      /(?:i need|get me|buy)\s+(.+)/i
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
        } else if (pattern === addPatterns[3]) {
          // Pattern: "I need milk" or "get me bread"
          itemName = match[1].trim();
          quantity = 1;
          unit = 'COUNT';
        }

        if (itemName && !isNaN(quantity)) {
          return {
            action: 'add',
            itemName: capitalizeWords(itemName),
            quantity,
            unit: unit.toUpperCase(),
            suggestRecipe: true
          };
        }
      }
    }

    // Simple add without quantity - only if explicitly using add/get/buy commands
    const simpleAdd = lowerCommand.match(/^(?:add|get|buy)\s+(.+)/i);
    if (simpleAdd) {
      const itemName = simpleAdd[1].trim();
      // Double-check it's not a question disguised as an add command
      if (!itemName.includes('?') && !questionWords.some(word => itemName.includes(word))) {
        return {
          action: 'add',
          itemName: capitalizeWords(itemName),
          quantity: 1,
          unit: 'COUNT',
          suggestRecipe: true
        };
      }
    }

    // Toggle/complete item commands
    if (lowerCommand.includes('complete') || lowerCommand.includes('check off') || lowerCommand.includes('mark') || lowerCommand.includes('got')) {
      const item = lowerCommand.replace(/(complete|check off|mark|done|got|i got)\s*/i, '').trim();
      if (item && onToggleItem) {
        return { action: 'toggle', itemName: capitalizeWords(item) };
      }
    }

    // Delete item commands
    if (lowerCommand.includes('remove') || lowerCommand.includes('delete') || lowerCommand.includes('take off')) {
      const item = lowerCommand.replace(/(remove|delete|take off)\s*/i, '').trim();
      if (item && onDeleteItem) {
        return { action: 'delete', itemName: capitalizeWords(item) };
      }
    }

    // If no pattern matches, treat as conversational
    return { action: 'conversation', query: command };
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

  // Generate conversational responses with follow-up questions
  const getConversationalResponse = useCallback((action: string, itemName: string, quantity?: number, unit?: string) => {
    const responses = {
      add: [
        `Perfect! I've added ${quantity === 1 ? '' : quantity + ' '}${unit && unit !== 'COUNT' ? unit.toLowerCase() + ' of ' : ''}${itemName} to your list. What are you planning to make with that?`,
        `Got it! ${itemName} is now on your shopping list${quantity && quantity > 1 ? ` - ${quantity} ${unit?.toLowerCase()}` : ''}. Are you cooking something special?`,
        `Done! Added ${itemName} to your list${quantity && quantity > 1 ? ` (${quantity} ${unit?.toLowerCase()})` : ''}. Need any ingredients to go with that?`,
        `Great choice! ${itemName} is added${quantity && quantity > 1 ? ` - ${quantity} ${unit?.toLowerCase()}` : ''}. What else can I help you find?`,
        `Nice! I've put ${itemName} on your list${quantity && quantity > 1 ? ` with ${quantity} ${unit?.toLowerCase()}` : ''}. Tell me about your meal plans!`
      ],
      toggle: [
        `Awesome! I've marked ${itemName} as done. One less thing to worry about!`,
        `Great job! ${itemName} is now checked off your list.`,
        `Perfect! ${itemName} is complete. You're making good progress!`,
        `Nice work! ${itemName} is marked as finished.`
      ],
      delete: [
        `No problem! I've removed ${itemName} from your list.`,
        `Done! ${itemName} is off your shopping list now.`,
        `Got it! ${itemName} has been deleted from your list.`,
        `Sure thing! ${itemName} is no longer on your list.`
      ]
    };

    const actionResponses = responses[action as keyof typeof responses] || [];
    return actionResponses[Math.floor(Math.random() * actionResponses.length)];
  }, []);

  // Recipe and meal suggestions based on ingredients
  const suggestRecipeIngredients = useCallback((ingredient: string) => {
    const recipeMap: Record<string, string[]> = {
      'chicken': ['onions', 'garlic', 'olive oil', 'salt', 'pepper', 'herbs'],
      'pasta': ['tomatoes', 'garlic', 'basil', 'parmesan cheese', 'olive oil'],
      'eggs': ['milk', 'butter', 'cheese', 'bread', 'bacon'],
      'rice': ['soy sauce', 'vegetables', 'garlic', 'ginger', 'sesame oil'],
      'salmon': ['lemon', 'dill', 'asparagus', 'olive oil', 'garlic'],
      'beef': ['onions', 'carrots', 'potatoes', 'beef broth', 'herbs'],
      'bread': ['butter', 'jam', 'eggs', 'milk', 'avocado'],
      'milk': ['cereal', 'cookies', 'coffee', 'bananas'],
      'tomatoes': ['basil', 'mozzarella', 'balsamic vinegar', 'olive oil'],
      'potatoes': ['butter', 'sour cream', 'chives', 'bacon'],
      'bananas': ['peanut butter', 'honey', 'oats', 'yogurt'],
      'apples': ['cinnamon', 'oats', 'honey', 'walnuts']
    };

    const baseIngredient = ingredient.toLowerCase().replace(/s$/, ''); // Remove plural
    const suggestions = recipeMap[baseIngredient];
    
    if (suggestions) {
      const randomSuggestions = suggestions.slice(0, 3);
      return `Since you're getting ${ingredient}, you might also want ${randomSuggestions.join(', ')} for a delicious meal!`;
    }
    
    return null;
  }, []);

  // AI-powered conversational query handler with recipe fallback
  const handleConversationalQuery = useCallback(async (query: string): Promise<string> => {
    const lowerQuery = query.toLowerCase();
    
    // Check if this is a recipe-related query
    const recipeKeywords = ['recipe', 'cook', 'make', 'meal', 'how to', 'ingredients', 'preparation', 'dish'];
    const isRecipeQuery = recipeKeywords.some(keyword => lowerQuery.includes(keyword));
    
    if (isRecipeQuery) {
      // Handle recipe queries without OpenAI
      if (lowerQuery.includes('chicken')) {
        return "Here's a simple chicken recipe: Season chicken breast with salt, pepper, and herbs. Cook in a pan with olive oil for 6-7 minutes per side. Would you like me to add chicken breast to your shopping list?";
      } else if (lowerQuery.includes('pasta')) {
        return "For a great pasta dish, try this: Cook pasta according to package directions. Sauté garlic in olive oil, add tomatoes and herbs. Mix with pasta and top with parmesan. Should I add pasta, tomatoes, and garlic to your list?";
      } else if (lowerQuery.includes('soup')) {
        return "Here's a hearty soup recipe: Sauté onions, carrots, and celery. Add broth, potatoes, and herbs. Simmer for 20 minutes. Would you like me to add these ingredients to your shopping list?";
      } else if (lowerQuery.includes('salad')) {
        return "For a fresh salad: Mix greens, cherry tomatoes, cucumber, and your favorite dressing. Add some protein like chicken or cheese. Should I add salad ingredients to your list?";
      } else {
        return "I'd love to help with recipes! While I don't have access to specific recipes right now, I can help you add ingredients to your shopping list. What dish are you planning to make?";
      }
    }
    
    try {
      // Add current query to context
      const updatedContext = [...conversationContext.slice(-4), query]; // Keep last 5 exchanges
      
      // Call the AI conversation endpoint
      const response = await fetch('/api/voice/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: query,
          context: updatedContext 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Update conversation context
      setConversationContext(prev => [...prev.slice(-4), query, data.response]);
      
      return data.response;
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Enhanced fallback responses based on query type
      if (lowerQuery.includes('help')) {
        return "I'm here to help! You can ask me to add items like 'add milk' or 'I need 2 pounds of chicken'. I can also suggest simple recipes. What would you like to do?";
      } else if (lowerQuery.includes('suggest') || lowerQuery.includes('recommend')) {
        return "I'd recommend some staples like chicken, vegetables, pasta, and rice for versatile meal options. Would you like me to add any of these to your list?";
      } else {
        const fallbackResponses = [
          "I can help you with your shopping list! Try saying 'add milk' or ask me about simple recipes. What would you like to add?",
          "Let me help you build your shopping list! You can ask me to add items or suggest ingredients for meals. What are you planning to cook?",
          "I'm ready to help with your shopping! Tell me what to add to your list or ask about meal ideas. What sounds good to you?"
        ];
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      }
    }
  }, [conversationContext]);

  // Process voice command
  const processVoiceCommand = useCallback(async (command: string) => {
    setIsProcessingVoice(true);
    
    try {
      const parsedCommand = parseVoiceCommand(command);
      
      if (parsedCommand) {
        switch (parsedCommand.action) {
          case 'add':
            await onAddItem(parsedCommand.itemName, parsedCommand.quantity, parsedCommand.unit);
            let response = getConversationalResponse('add', parsedCommand.itemName, parsedCommand.quantity, parsedCommand.unit);
            
            // Add recipe suggestions if enabled
            if (parsedCommand.suggestRecipe) {
              const recipeSuggestion = suggestRecipeIngredients(parsedCommand.itemName);
              if (recipeSuggestion) {
                response += ` ${recipeSuggestion}`;
              }
            }
            
            speak(response);
            break;
            
          case 'toggle':
            if (onToggleItem) {
              onToggleItem(parsedCommand.itemName);
              speak(getConversationalResponse('toggle', parsedCommand.itemName));
            }
            break;
            
          case 'delete':
            if (onDeleteItem) {
              onDeleteItem(parsedCommand.itemName);
              speak(getConversationalResponse('delete', parsedCommand.itemName));
            }
            break;
            
          case 'conversation':
            const conversationalResponse = await handleConversationalQuery(parsedCommand.query);
            speak(conversationalResponse);
            break;
        }
      } else {
        const notUnderstoodResponses = [
          "I'm not sure what you meant. You can ask me to add items, suggest recipes, or help plan meals!",
          "Let me help you! Try saying 'add milk' or ask me 'what should I cook tonight?'",
          "I can help with shopping and cooking! What would you like to know?",
          "Tell me what you're planning to make, or ask me to add something to your list!"
        ];
        speak(notUnderstoodResponses[Math.floor(Math.random() * notUnderstoodResponses.length)]);
        
        toast({
          title: "Let's Chat!",
          description: "Ask me about recipes, meal planning, or tell me to add items to your list",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      const errorResponses = [
        "Oops, something went wrong on my end. Could you try that again?",
        "Sorry about that! I ran into a little issue. Give it another try?",
        "Hmm, I had trouble with that command. Mind trying once more?",
        "My apologies! Something didn't work right. Please try again."
      ];
      speak(errorResponses[Math.floor(Math.random() * errorResponses.length)]);
      
      toast({
        title: "Error",
        description: "Failed to process voice command",
        variant: "destructive"
      });
    } finally {
      setIsProcessingVoice(false);
    }
  }, [parseVoiceCommand, onAddItem, onToggleItem, onDeleteItem, speak, toast, getConversationalResponse, suggestRecipeIngredients, handleConversationalQuery]);

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

        // Process the final command but keep listening
        processVoiceCommand(finalTranscript);
        
        // Clear transcript after processing
        setTimeout(() => {
          setTranscript('');
        }, 2000);
      }
    };

    recognitionRef.current.onend = () => {
      // If we're supposed to be listening, restart the recognition
      if (isListening) {
        try {
          recognitionRef.current?.start();
        } catch (error) {
          console.warn('Failed to restart speech recognition:', error);
          setIsListening(false);
        }
      }
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
      const greetings = [
        "Hi there! I'm your shopping assistant and I'm now listening continuously. You can ask me to add items, suggest simple recipes, or help plan your meals. I'll keep listening until you tell me to stop!",
        "Hey! I'm here to help with your shopping and cooking. I can suggest recipes for chicken, pasta, soups, and salads. I'll stay active and listen for your commands. What would you like to talk about?",
        "Hello! I can help you add items to your list or share simple recipe ideas. I'm listening continuously now, so just talk to me naturally!",
        "Hi! Ready to help with your shopping list and meal planning. I know some great recipes for common ingredients. I'll keep listening for your voice commands. What are you thinking about making?",
        "Hey there! I'm your kitchen companion and I'm staying active to listen. Ask me about simple recipes, meal ideas, or tell me what to add to your list!"
      ];
      speak(greetings[Math.floor(Math.random() * greetings.length)]);
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
      speak("Great! Now I can talk back to you. Voice feedback is on!");
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
            {isProcessingVoice ? 'Processing...' : isListening ? 'Stop Listening' : 'Start Conversation'}
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
