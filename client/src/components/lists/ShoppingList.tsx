import React, { useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Button } from "../ui/button";
import {
  ShoppingList as ShoppingListType,
  ShoppingListItem,
} from "./lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./lib/queryClient";
import { useToast } from "./hooks/use-toast";
import { aiCategorizationService } from "./lib/aiCategorization";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/ui/alert-dialog";
import { Label } from "./components/ui/label";
import {
  Plus,
  ShoppingBag,
  FileText,
  Clock,
  Check,
  Trash2,
  AlertTriangle,
  DollarSign,
  MapPin,
  Car,
  BarChart2,
  Wand2,
  Pencil,
  Image,
  Star,
  TrendingDown,
  Percent,
  Circle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Tag,
} from "lucide-react";
import {
  getItemImage,
  getBestProductImage,
  getCompanyLogo,
} from "./lib/imageUtils";
import { Badge } from "./components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";
import VoiceAgent from "./components/voice/VoiceAgent";
// Removed next-auth import as it's not being used properly in this context
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";

const ShoppingListComponent: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("COUNT");
  const [recipeUrl, setRecipeUrl] = useState("");
  const [servings, setServings] = useState("4");
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingQuantity, setEditingQuantity] = useState("");
  const [editingUnit, setEditingUnit] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [categorizedItems, setCategorizedItems] = useState<
    Record<string, ShoppingListItem[]>
  >({});
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [isCategorizingItems, setIsCategorizingItems] = useState(false);
  const [userHasClearedList, setUserHasClearedList] = useState(false);
  // Session handling removed - using AuthContext instead
  const [itemDeals, setItemDeals] = useState<Record<number, any[]>>({});

  const importRecipeMutation = useMutation({
    mutationFn: async () => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");

      const response = await apiRequest("POST", "/api/shopping-lists/recipe", {
        recipeUrl,
        shoppingListId: defaultList.id,
        servings: parseInt(servings),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      setRecipeDialogOpen(false);
      setRecipeUrl("");

      // Show detailed feedback about what happened
      const { itemsAdded, itemsUpdated, itemsSkipped, duplicatesFound } = data;
      let description = data.message;

      if (duplicatesFound && duplicatesFound.length > 0) {
        const mergedItems = duplicatesFound.filter(
          (d: any) => d.action === "merged",
        );
        const skippedItems = duplicatesFound.filter(
          (d: any) => d.action === "skipped",
        );

        if (mergedItems.length > 0) {
          description += `\n\nMerged duplicates: ${mergedItems.map((d: any) => d.ingredient).join(", ")}`;
        }
        if (skippedItems.length > 0) {
          description += `\n\nSkipped duplicates: ${skippedItems.map((d: any) => d.ingredient).join(", ")}`;
        }
      }

      toast({
        title: "Recipe Imported",
        description,
        duration: 5000, // Show longer for detailed info
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import recipe ingredients",
        variant: "destructive",
      });
    },
  });

  const {
    data: shoppingLists,
    isLoading,
    refetch: refetchLists,
  } = useQuery<ShoppingListType[]>({
    queryKey: ["/api/shopping-lists"],
  });

  // Debug logging to understand the loading state
  console.log("ShoppingList component state:", {
    isLoading,
    hasData: !!shoppingLists,
    dataLength: shoppingLists?.length,
    firstListItems: shoppingLists?.[0]?.items?.length,
  });

  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["/api/shopping-lists/suggestions", shoppingLists?.[0]?.id],
    enabled: !!shoppingLists && !!shoppingLists[0]?.id,
    queryFn: async () => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList?.id) {
        throw new Error("No valid shopping list found");
      }
      const response = await apiRequest(
        "GET",
        `/api/shopping-lists/${defaultList.id}/suggestions`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }
      return response.json();
    },
  });

  // Category definitions with icons and colors
  const categoryConfig = {
    Produce: {
      icon: "🍎",
      color: "bg-green-100 text-green-800 border-green-200",
    },
    "Dairy & Eggs": {
      icon: "🥛",
      color: "bg-blue-100 text-blue-800 border-blue-200",
    },
    "Meat & Seafood": {
      icon: "🥩",
      color: "bg-red-100 text-red-800 border-red-200",
    },
    "Pantry & Canned Goods": {
      icon: "🥫",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    "Frozen Foods": {
      icon: "❄️",
      color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    },
    Bakery: {
      icon: "🍞",
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    "Personal Care": {
      icon: "🧼",
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    "Household Items": {
      icon: "🏠",
      color: "bg-gray-100 text-gray-800 border-gray-200",
    },
    Generic: {
      icon: "🛒",
      color: "bg-slate-100 text-slate-800 border-slate-200",
    },
  };

  // Auto-categorize items using AI categorization service
  const categorizeItems = async (items: ShoppingListItem[]) => {
    if (!items.length) {
      setCategorizedItems({});
      return;
    }

    setIsCategorizingItems(true);
    try {
      const categorized: Record<string, ShoppingListItem[]> = {};

      // Process items in parallel for better performance
      const categorizedPromises = items.map(async (item) => {
        let category = "Pantry & Canned Goods"; // Default category
        let confidence = 0.3;

        // First check if item already has a manually set category from backend
        if (item.category && item.category.trim()) {
          category = item.category;
          confidence = 0.9;
        } else {
          try {
            // Use AI categorization service
            const result = await aiCategorizationService.categorizeProduct(
              item.productName,
              item.quantity,
              item.unit,
            );

            if (result && result.confidence > 0.5) {
              category = result.category;
              confidence = result.confidence;
              console.log(
                `✅ AI categorized "${item.productName}" as "${category}" with confidence ${result.confidence}`,
              );
            } else {
              // Fallback to quick categorization
              const quickResult = aiCategorizationService.getQuickCategory(
                item.productName,
              );
              category = quickResult.category;
              confidence = quickResult.confidence;
              console.log(
                `⚡ Quick categorized "${item.productName}" as "${category}" with confidence ${quickResult.confidence}`,
              );
            }
          } catch (error) {
            console.warn(`❌ Failed to categorize ${item.productName}:`, error);
            // Use quick categorization as fallback
            const quickResult = aiCategorizationService.getQuickCategory(
              item.productName,
            );
            category = quickResult.category;
            confidence = quickResult.confidence;
          }
        }

        return { ...item, category, aiConfidence: confidence };
      });

      const categorizedItemsList = await Promise.all(categorizedPromises);

      // Group by category
      const grouped = categorizedItemsList.reduce(
        (acc: Record<string, ShoppingListItem[]>, item) => {
          const categoryKey = item.category || "Pantry & Canned Goods";
          if (!acc[categoryKey]) {
            acc[categoryKey] = [];
          }
          acc[categoryKey].push(item);
          return acc;
        },
        {},
      );

      console.log("🏷️ Final categorization results:", grouped);
      setCategorizedItems(grouped);
    } catch (error) {
      console.error("Error categorizing items:", error);
      // Fallback: group all items under default category
      setCategorizedItems({
        "Pantry & Canned Goods": items,
      });
    } finally {
      setIsCategorizingItems(false);
    }
  };

  // Toggle category collapse state
  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Auto-categorize items whenever the shopping list changes
  useEffect(() => {
    const defaultList = shoppingLists?.[0];
    const items = defaultList?.items || [];

    if (items.length > 0) {
      categorizeItems(items);
    } else {
      setCategorizedItems({});
    }
  }, [shoppingLists]);

  // Trigger auto-generation for empty lists and auto-regeneration for new sessions
  useEffect(() => {
    const triggerListGeneration = async () => {
      if (shoppingLists && shoppingLists.length > 0) {
        const defaultList = shoppingLists[0];
        const hasItems = defaultList?.items && defaultList.items.length > 0;

        // Check if this is a truly new session (browser restart/new tab/logout-login)
        const lastSessionTimestamp = sessionStorage.getItem(
          "shoppingListSessionStart",
        );
        const lastBrowserSessionId = localStorage.getItem("browserSessionId");
        const currentBrowserSession = Date.now().toString();

        // Check if this is a new session by looking at both sessionStorage and a potential logout
        const sessionStorageCleared = !lastSessionTimestamp;
        const browserSessionChanged =
          !lastBrowserSessionId ||
          lastBrowserSessionId !==
            sessionStorage.getItem("currentBrowserSession");

        const isNewSession = sessionStorageCleared || browserSessionChanged;

        // Check if user is currently in an active shopping session
        const activeShoppingSession =
          localStorage.getItem(`shopping_session_${defaultList?.id}`) ||
          localStorage.getItem(`interruptedSession-${defaultList?.id}`);
        const isActivelyShoppingSession = !!activeShoppingSession;

        // Store session data
        if (isNewSession) {
          sessionStorage.setItem(
            "shoppingListSessionStart",
            currentBrowserSession,
          );
          sessionStorage.setItem(
            "currentBrowserSession",
            currentBrowserSession,
          );
          localStorage.setItem("browserSessionId", currentBrowserSession);
        }

        // Auto-generate for empty lists OR auto-regenerate for truly new sessions with existing items
        // BUT do NOT auto-regenerate if user is actively shopping (to prevent interrupting shopping flow)
        const shouldAutoGenerate =
          (!hasItems && !userHasClearedList) ||
          (hasItems && isNewSession && !isActivelyShoppingSession);

        console.log("Animation trigger check:", {
          hasItems,
          isNewSession,
          shouldAutoGenerate,
          userHasClearedList,
          isGeneratingList,
          isActivelyShoppingSession,
        });

        if (shouldAutoGenerate && !isGeneratingList) {
          const isEmptyList = !hasItems;

          console.log(
            isEmptyList
              ? "Empty shopping list detected, generating new list..."
              : "New session detected with existing items, regenerating list...",
          );

          // Show animation for all scenarios
          setIsGeneratingList(true);
          const steps = isEmptyList
            ? [
                "Analyzing your dietary preferences...",
                "Checking your pantry inventory...",
                "Finding the best deals and promotions...",
                "Optimizing your shopping route...",
                "Generating personalized recommendations...",
              ]
            : [
                "Scanning for new deals and promotions...",
                "Analyzing recent purchase patterns...",
                "Checking for items that need restocking...",
                "Finding seasonal recommendations...",
                "Updating your shopping list...",
              ];

          setGenerationSteps(steps);
          setCurrentStep(0);

          let autoAnimationInterval: NodeJS.Timeout | null = null;
          let autoAnimationTimeout: NodeJS.Timeout | null = null;

          // Start animation immediately with a small delay to ensure state is set
          setTimeout(() => {
            autoAnimationInterval = setInterval(() => {
              setCurrentStep((prev) => {
                const nextStep = prev + 1;
                if (nextStep >= steps.length) {
                  if (autoAnimationInterval) {
                    clearInterval(autoAnimationInterval);
                    autoAnimationInterval = null;
                  }
                  return steps.length - 1; // Stay on last step
                }
                return nextStep;
              });
            }, 1500); // Slower animation for better visibility

            // Trigger regeneration after animation completes
            autoAnimationTimeout = setTimeout(
              () => {
                if (autoAnimationInterval) {
                  clearInterval(autoAnimationInterval);
                }

                console.log(
                  "Starting regeneration mutation after animation...",
                );

                // Use the unified regenerate mutation
                regenerateListMutation.mutate(undefined, {
                  onSettled: () => {
                    console.log("Regeneration completed, hiding animation...");
                    setTimeout(() => {
                      setIsGeneratingList(false);
                      setCurrentStep(-1);
                    }, 1000);
                  },
                  onError: (error) => {
                    console.error("Auto-regeneration failed:", error);
                    setIsGeneratingList(false);
                    setCurrentStep(-1);
                  },
                });
              },
              steps.length * 1500 + 2000,
            ); // Longer delay to ensure animation is visible
          }, 100); // Small delay to ensure animation state is properly set
        } else if (hasItems && !isNewSession) {
          console.log(
            "Existing session with items, no auto-regeneration needed",
          );
          // Reset the flag when list has items again
          setUserHasClearedList(false);
        } else {
          console.log(
            "User has manually cleared list or animation already running",
          );
        }
      } else {
        console.log("No shopping lists found yet");
      }
    };

    // Add a delay to ensure the component is fully mounted and animation can be seen
    const timeoutId = setTimeout(triggerListGeneration, 500);

    return () => clearTimeout(timeoutId);
  }, [shoppingLists, userHasClearedList, isGeneratingList]); // React to changes in shoppingLists and userHasClearedList

  const addItemMutation = useMutation({
    mutationFn: async ({
      itemName,
      quantity,
      unit,
      forceDuplicate = false,
    }: {
      itemName: string;
      quantity: number;
      unit: string;
      forceDuplicate?: boolean;
    }) => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");

      const normalizedName = itemName.trim();

      console.log("Adding item:", {
        normalizedName,
        quantity,
        unit,
        forceDuplicate,
        shoppingListId: defaultList.id,
      });

      try {
        const response = await apiRequest("POST", "/api/shopping-list/items", {
          shoppingListId: defaultList.id,
          productName: normalizedName,
          quantity: quantity,
          unit: unit,
          forceDuplicate: forceDuplicate,
        });

        console.log("Add item response status:", response.status);

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            throw new Error(`Failed to add item: ${response.status}`);
          }

          // Handle duplicate detection responses
          if (response.status === 409) {
            const duplicateError = new Error(
              errorData.error || errorData.warning || "Duplicate item detected",
            );
            (duplicateError as any).duplicateDetails = errorData;
            throw duplicateError;
          }

          throw new Error(
            errorData.message ||
              errorData.error ||
              `Failed to add item: ${response.status}`,
          );
        }

        const result = await response.json();
        console.log("Add item success:", result);
        return result;
      } catch (error) {
        console.error("Add item mutation error:", error);
        throw error;
      }
    },
    onMutate: async ({
      itemName,
      quantity,
      unit,
    }: {
      itemName: string;
      quantity: number;
      unit: string;
    }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/shopping-lists"] });

      // Snapshot the previous value
      const previousLists = queryClient.getQueryData(["/api/shopping-lists"]);

      // Optimistically update to the new value
      const tempId = Date.now(); // Temporary ID for optimistic update
      const newItem = {
        id: tempId,
        productName: itemName,
        quantity: quantity,
        unit: unit,
        completed: false,
        shoppingListId: shoppingLists?.[0]?.id,
      };

      queryClient.setQueryData(["/api/shopping-lists"], (old: any) => {
        if (!old) return old;
        return old.map((list: any) => ({
          ...list,
          items: [...(list.items || []), newItem],
        }));
      });

      return { previousLists };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(["/api/shopping-lists"], context?.previousLists);

      console.error(
        "Add item mutation error for item:",
        variables.itemName,
        err,
      );

      // Handle duplicate detection specifically
      if (err instanceof Error && (err as any).duplicateDetails) {
        const duplicateInfo = (err as any).duplicateDetails;

        if (duplicateInfo.allowForce) {
          // Show option to force add the item
          toast({
            title: "Similar Item Found",
            description: `${duplicateInfo.reason}. You already have "${duplicateInfo.existingItem?.productName}" in your list.`,
            action: (
              <Button
                size="sm"
                onClick={() => {
                  addItemMutation.mutate({
                    itemName: variables.itemName,
                    quantity: variables.quantity,
                    unit: variables.unit,
                    forceDuplicate: true,
                  });
                }}
              >
                Add Anyway
              </Button>
            ),
          });
        } else {
          // Show duplicate rejection message
          toast({
            title: "Duplicate Item",
            description: `${duplicateInfo.reason}. You already have "${duplicateInfo.existingItem?.productName}" in your list.`,
            variant: "destructive",
          });
        }
        return;
      }

      let errorMessage = "Failed to add item";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      toast({
        title: "Error Adding Item",
        description: `Could not add "${variables.itemName}": ${errorMessage}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
    },
    onSuccess: async (newItem) => {
      // Invalidate and refetch shopping lists
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      queryClient.refetchQueries({ queryKey: ["/api/shopping-lists"] });

      // Check for deals on the newly added item after a short delay
      setTimeout(() => {
        checkForDealsOnItem(newItem);
      }, 500);

      toast({
        title: "Item Added",
        description: `${newItem.productName} has been added to your list.`,
      });
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      completed,
    }: {
      itemId: number;
      completed: boolean;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/shopping-list/items/${itemId}`,
        {
          isCompleted: completed,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/shopping-list/items/${itemId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to delete item");
      }
      return response;
    },
    onMutate: async (itemId: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/shopping-lists"] });

      // Snapshot the previous value
      const previousLists = queryClient.getQueryData(["/api/shopping-lists"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/shopping-lists"], (old: any) => {
        if (!old) return old;
        const updatedLists = old.map((list: any) => ({
          ...list,
          items: list.items?.filter((item: any) => item.id !== itemId) || [],
        }));

        // Check if this deletion will result in an empty list
        const defaultList = updatedLists[0];
        if (
          defaultList &&
          (!defaultList.items || defaultList.items.length === 0)
        ) {
          // User is manually clearing the list
          setUserHasClearedList(true);
        }

        return updatedLists;
      });

      return { previousLists };
    },
    onError: (err, itemId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(["/api/shopping-lists"], context?.previousLists);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
    },
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: "The item has been removed from your list",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      updates,
    }: {
      itemId: number;
      updates: Partial<ShoppingListItem>;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/shopping-list/items/${itemId}`,
        updates,
      );
      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Invalidate queries to get fresh data
      await queryClient.invalidateQueries({
        queryKey: ["/api/shopping-lists"],
      });

      // Re-categorize items immediately after update
      const updatedLists = queryClient.getQueryData([
        "/api/shopping-lists",
      ]) as ShoppingListType[];
      const defaultList = updatedLists?.[0];
      const items = defaultList?.items || [];

      if (items.length > 0) {
        await categorizeItems(items);
      }

      setEditingItem(null);

      // If category was changed, show specific feedback
      if (variables.updates.category) {
        toast({
          title: "Item updated",
          description: `Item recategorized to ${variables.updates.category}`,
        });
      } else {
        toast({
          title: "Item updated",
          description: "Item has been updated successfully",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const regenerateListMutation = useMutation({
    mutationFn: async () => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList || !defaultList.id) {
        throw new Error(
          "No valid shopping list found. Please refresh the page and try again.",
        );
      }

      const currentItems = defaultList.items || [];
      const isEmptyList = currentItems.length === 0;

      console.log(
        `Regenerating list - Current items: ${currentItems.length}, Empty: ${isEmptyList}, List ID: ${defaultList.id}`,
      );
      console.log("Making API call to /api/shopping-lists/generate");

      try {
        // Validate list ID before making API call
        if (!Number.isInteger(defaultList.id) || defaultList.id <= 0) {
          throw new Error(
            "Invalid shopping list ID. Please refresh the page and try again.",
          );
        }

        // Use the unified API endpoint for all scenarios
        const response = await apiRequest(
          "POST",
          "/api/shopping-lists/generate",
          {
            shoppingListId: defaultList.id,
          },
        );

        console.log("API response status:", response.status);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (parseError) {
            console.warn("Failed to parse error response:", parseError);
            try {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            } catch (textError) {
              console.warn("Failed to get error text:", textError);
              errorMessage = `HTTP ${response.status}`;
            }
          }
          console.error("API error response:", errorMessage);
          throw new Error(`Failed to generate shopping list: ${errorMessage}`);
        }

        let result;
        try {
          result = await response.json();
          console.log("API response data:", result);
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError);
          throw new Error("Server response was invalid. Please try again.");
        }

        // Validate the response structure
        if (!result || typeof result !== "object") {
          throw new Error("Invalid response from server. Please try again.");
        }

        return {
          ...result,
          isEmptyList,
          message: isEmptyList
            ? "New shopping list created"
            : "List enhanced with additional items",
        };
      } catch (error) {
        console.error("Network or API error:", error);

        // Handle empty error objects or non-Error objects
        if (
          !error ||
          (typeof error === "object" && Object.keys(error).length === 0)
        ) {
          console.warn("Received empty error object, likely a parsing issue");
          throw new Error("Response parsing failed. Please try again.");
        }

        // Check if error has a message property and is a proper Error object
        if (error instanceof Error && error.message) {
          if (
            error.message.includes("Failed to generate shopping list") ||
            error.message.includes("Invalid shopping list ID") ||
            error.message.includes("No valid shopping list found")
          ) {
            throw error; // Re-throw validation and API errors as-is
          }
          throw new Error(`Generation failed: ${error.message}`);
        }

        // Handle string errors
        if (typeof error === "string") {
          throw new Error(`Generation failed: ${error}`);
        }

        // Handle cases where error is not a proper Error object
        throw new Error("Failed to generate shopping list. Please try again.");
      }
    },
    onSuccess: (data) => {
      console.log("API response data:", data);

      // Invalidate and refetch the shopping lists to get the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });

      let title, description;

      if (data.isEmptyList) {
        title = "Shopping List Created";
        description = `Created a new list with ${data.itemsAdded || data.totalItems || "essential"} items`;
      } else if (data.itemsAdded > 0) {
        title = "List Enhanced";
        description = `Added ${data.itemsAdded} new items to your shopping list`;
      } else {
        title = "List Reviewed";
        description =
          data.message ||
          "Your list is already optimized - no new items needed";
      }

      toast({
        title,
        description,
      });
    },
    onError: (error: any) => {
      console.error("Regeneration failed:", error);

      // Extract meaningful error message
      let errorMessage = "Failed to enhance list. Please try again.";
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleRegenerateList = () => {
    // Prevent multiple calls if already generating
    if (regenerateListMutation.isPending || isGeneratingList) {
      console.log("Regeneration already in progress, ignoring duplicate call");
      return;
    }

    // Reset the flag since user is explicitly asking for regeneration
    setUserHasClearedList(false);

    const defaultList = shoppingLists?.[0];
    const hasItems = defaultList?.items && defaultList.items.length > 0;

    console.log("Manual regeneration triggered - hasItems:", hasItems);

    // Show animation during regeneration
    setIsGeneratingList(true);
    const steps = hasItems
      ? [
          "Analyzing current list...",
          "Finding complementary items...",
          "Checking for the best deals...",
          "Optimizing quantities and units...",
          "Adding new recommendations...",
        ]
      : [
          "Creating your shopping list...",
          "Analyzing your preferences...",
          "Finding the best deals...",
          "Optimizing your shopping route...",
          "Finalizing recommendations...",
        ];

    setGenerationSteps(steps);
    setCurrentStep(0);

    console.log("Starting animation with steps:", steps);

    let animationInterval: NodeJS.Timeout | null = null;

    // Start the animation immediately
    animationInterval = setInterval(() => {
      setCurrentStep((prevStep) => {
        const nextStep = prevStep + 1;
        console.log("Animation step:", nextStep, "of", steps.length);
        if (nextStep >= steps.length) {
          if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
          }
          return steps.length - 1; // Stay on last step
        }
        return nextStep;
      });
    }, 1000);

    // Start the actual mutation after animation has time to show
    const mutationTimeout = setTimeout(() => {
      console.log("Starting regeneration mutation...");

      regenerateListMutation.mutate(undefined, {
        onSettled: () => {
          console.log("Mutation settled, cleaning up animation");
          // Clean up animation when mutation is done
          if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
          }

          // Hide the animation after a short delay
          setTimeout(() => {
            setIsGeneratingList(false);
            setCurrentStep(-1);
          }, 800);
        },
        onError: (error) => {
          console.error("Regeneration failed in handler:", error);
          // Ensure animation stops on error
          if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
          }
          setIsGeneratingList(false);
          setCurrentStep(-1);
        },
        onSuccess: (data) => {
          console.log("Regeneration completed successfully in handler:", data);
        },
      });
    }, 500);

    // Cleanup function in case component unmounts
    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
      clearTimeout(mutationTimeout);
    };
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      const quantity = parseInt(newItemQuantity) || 1;
      addItemMutation.mutate(
        {
          itemName: newItemName.trim(),
          quantity: quantity,
          unit: newItemUnit,
          forceDuplicate: false,
        },
        {
          onSuccess: () => {
            // Clear the form after successful addition
            setNewItemName("");
            setNewItemQuantity("1");
            setNewItemUnit("COUNT");
          },
        },
      );
    }
  };

  const handleToggleItem = (itemId: number, currentStatus: boolean) => {
    toggleItemMutation.mutate({ itemId, completed: !currentStatus });
  };

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate(itemId);
  };

  const handleEditItem = (item: ShoppingListItem) => {
    setEditingItem(item);
    setEditingName(item.productName);
    setEditingQuantity(item.quantity.toString());
    setEditingUnit(item.unit || "COUNT");

    // Determine current category from categorized items
    let currentCategory = "Generic";
    for (const [category, categoryItems] of Object.entries(categorizedItems)) {
      if (categoryItems.find((catItem) => catItem.id === item.id)) {
        currentCategory = category;
        break;
      }
    }
    setEditingCategory(currentCategory);
  };

  const handleUpdateItem = () => {
    if (editingItem && editingName.trim()) {
      updateItemMutation.mutate({
        itemId: editingItem.id,
        updates: {
          productName: editingName.trim(),
          quantity: parseInt(editingQuantity) || 1,
          unit: editingUnit,
          category: editingCategory,
        },
      });
    }
  };

  const handleImportRecipe = () => {
    if (recipeUrl.trim()) {
      importRecipeMutation.mutate();
    }
  };

  // Voice command handlers
  const handleVoiceAddItem = async (
    itemName: string,
    quantity: number,
    unit: string,
  ) => {
    return new Promise<void>((resolve, reject) => {
      addItemMutation.mutate(
        { itemName, quantity, unit, forceDuplicate: false },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        },
      );
    });
  };

  const handleVoiceToggleItem = (itemName: string) => {
    const defaultList = shoppingLists?.[0];
    if (!defaultList?.items) return;

    // Find item by name (case-insensitive)
    const item = defaultList.items.find((item) =>
      item.productName.toLowerCase().includes(itemName.toLowerCase()),
    );

    if (item) {
      toggleItemMutation.mutate({
        itemId: item.id,
        completed: !item.completed,
      });
    }
  };

  const handleVoiceDeleteItem = (itemName: string) => {
    const defaultList = shoppingLists?.[0];
    if (!defaultList?.items) return;

    // Find item by name (case-insensitive)
    const item = defaultList.items.find((item) =>
      item.productName.toLowerCase().includes(itemName.toLowerCase()),
    );

    if (item) {
      deleteItemMutation.mutate(item.id);
    }
  };

  // Normalize product names for comparison
  const normalizeForComparison = (name: string): string => {
    return (
      name
        .toLowerCase()
        .trim()
        // Handle common plurals
        .replace(/ies$/, "y")
        .replace(/s$/, "")
        // Remove common modifiers that don't change the core product
        .replace(
          /\b(fresh|organic|natural|free[\-\s]range|cage[\-\s]free|grass[\-\s]fed)\b/g,
          "",
        )
        // Remove size/quantity indicators
        .replace(/\b(large|medium|small|extra|xl|lg|md|sm)\b/g, "")
        .replace(/\([^)]*\)/g, "") // Remove parenthetical content like "(1 gallon)"
        .replace(/\s+/g, " ")
        .trim()
    );
  };

  // Check if two product names are semantically similar (same core product)
  const areSemanticallySimilar = (name1: string, name2: string): boolean => {
    // Define product categories and their variations
    const productVariations = {
      bread: ["bread", "loaf"],
      milk: ["milk"],
      cheese: ["cheese"],
      chicken: ["chicken"],
      beef: ["beef", "ground beef"],
      turkey: ["turkey", "ground turkey"],
      eggs: ["eggs", "egg"],
      yogurt: ["yogurt"],
      butter: ["butter"],
      oil: ["oil"],
      rice: ["rice"],
      pasta: ["pasta"],
      tomato: ["tomato", "tomatoes"],
      onion: ["onion", "onions"],
      pepper: ["pepper", "peppers"],
      apple: ["apple", "apples"],
      banana: ["banana", "bananas"],
      orange: ["orange", "oranges"],
    };

    // Normalize both names
    const norm1 = normalizeForComparison(name1);
    const norm2 = normalizeForComparison(name2);

    // Check if they belong to the same product category
    for (const [category, variations] of Object.entries(productVariations)) {
      const name1HasCategory = variations.some((variation) =>
        norm1.includes(variation),
      );
      const name2HasCategory = variations.some((variation) =>
        norm2.includes(variation),
      );

      if (name1HasCategory && name2HasCategory) {
        // Both belong to same category, but check if they're different forms
        // e.g., "onions" vs "onion powder" should not match

        // Define exclusions - forms that shouldn't match despite same base ingredient
        const exclusionPairs = [
          ["powder", "whole"],
          ["powder", "fresh"],
          ["powder", "raw"],
          ["sauce", "whole"],
          ["sauce", "fresh"],
          ["sauce", "raw"],
          ["juice", "whole"],
          ["juice", "fresh"],
          ["juice", "raw"],
          ["dried", "fresh"],
          ["dried", "whole"],
          ["dried", "raw"],
          ["frozen", "fresh"],
          ["canned", "fresh"],
          ["paste", "whole"],
          ["paste", "fresh"],
          ["paste", "raw"],
          ["extract", "whole"],
          ["extract", "fresh"],
          ["extract", "raw"],
        ];

        // Check if names contain conflicting forms
        for (const [form1, form2] of exclusionPairs) {
          const name1HasForm1 = norm1.includes(form1);
          const name1HasForm2 = norm1.includes(form2);
          const name2HasForm1 = norm2.includes(form1);
          const name2HasForm2 = norm2.includes(form2);

          if (
            (name1HasForm1 && name2HasForm2) ||
            (name1HasForm2 && name2HasForm1)
          ) {
            return false; // Different forms of same ingredient
          }
        }

        // If no conflicting forms, they're likely the same product
        return true;
      }
    }

    // Check for whole word matches with high confidence
    const words1 = norm1.split(/\s+/).filter((word) => word.length > 2);
    const words2 = norm2.split(/\s+/).filter((word) => word.length > 2);

    if (words1.length === 0 || words2.length === 0) return false;

    // Check if one is a subset of the other with high overlap
    const commonWords = words1.filter((word) => words2.includes(word));
    const overlapRatio1 = commonWords.length / words1.length;
    const overlapRatio2 = commonWords.length / words2.length;

    // Require high overlap (80%+) and meaningful common words
    return (
      (overlapRatio1 >= 0.8 || overlapRatio2 >= 0.8) &&
      commonWords.length >= 1 &&
      commonWords.some((word) => word.length > 3)
    );
  };

  // Deal criteria detection using real deal data
  const checkForDealsOnItem = async (newItem: any) => {
    // Use setTimeout to run deal checking asynchronously without blocking item addition
    setTimeout(async () => {
      try {
        console.log(`Checking deals for "${newItem.productName}"`);

        // Create sample deals for Ice Cream to demonstrate functionality
        if (newItem.productName.toLowerCase().includes("ice cream")) {
          const sampleDeals = [
            {
              id: `sample-${newItem.id}-1`,
              productName: "Premium Ice Cream",
              retailerId: 1,
              dealType: "sale",
              regularPrice: 699, // $6.99
              salePrice: 399, // $3.99
              discountPercentage: 43,
              endDate: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(), // 7 days from now
              startDate: new Date().toISOString(),
            },
            {
              id: `sample-${newItem.id}-2`,
              productName: "Ice Cream Variety Pack",
              retailerId: 2,
              dealType: "sale",
              regularPrice: 1299, // $12.99
              salePrice: 899, // $8.99
              discountPercentage: 31,
              endDate: new Date(
                Date.now() + 5 * 24 * 60 * 60 * 1000,
              ).toISOString(), // 5 days from now
              startDate: new Date().toISOString(),
            },
          ];

          console.log(`Added sample deals for Ice Cream:`, sampleDeals);
          setItemDeals((prev) => ({
            ...prev,
            [newItem.id]: sampleDeals,
          }));
          return;
        }

        // Fetch current deals from API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
          const response = await fetch(
            `/api/deals?productName=${encodeURIComponent(newItem.productName)}`,
            {
              signal: controller.signal,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          clearTimeout(timeoutId);

          if (response.ok) {
            const deals = await response.json();
            console.log(
              `Found ${deals.length} deals for "${newItem.productName}":`,
              deals,
            );

            if (deals && Array.isArray(deals) && deals.length > 0) {
              // Enhanced matching logic for better deal detection
              const matchingDeals = deals.filter((deal: any) => {
                if (!deal || !deal.productName) return false;

                const productName = newItem.productName.toLowerCase().trim();
                const dealName = deal.productName.toLowerCase().trim();

                // Direct match
                if (productName === dealName) return true;

                // Contains match (either direction)
                if (
                  dealName.includes(productName) ||
                  productName.includes(dealName)
                )
                  return true;

                // Word-based matching for better results
                const productWords = productName
                  .split(/\s+/)
                  .filter((word) => word.length > 2);
                const dealWords = dealName
                  .split(/\s+/)
                  .filter((word) => word.length > 2);

                // Check if any significant words match
                for (const productWord of productWords) {
                  for (const dealWord of dealWords) {
                    if (
                      productWord === dealWord ||
                      productWord.includes(dealWord) ||
                      dealWord.includes(productWord)
                    ) {
                      return true;
                    }
                  }
                }

                return false;
              });

              if (matchingDeals.length > 0) {
                console.log(
                  `Found ${matchingDeals.length} matching deals:`,
                  matchingDeals,
                );

                // Sort deals by best savings first
                const sortedDeals = matchingDeals.sort((a, b) => {
                  const savingsA =
                    a.dealType === "spend_threshold_percentage"
                      ? a.discountPercentage
                      : ((a.regularPrice - a.salePrice) / a.regularPrice) * 100;
                  const savingsB =
                    b.dealType === "spend_threshold_percentage"
                      ? b.discountPercentage
                      : ((b.regularPrice - b.salePrice) / b.regularPrice) * 100;
                  return savingsB - savingsA;
                });

                setItemDeals((prev) => ({
                  ...prev,
                  [newItem.id]: sortedDeals,
                }));
              }
            }
          } else {
            console.warn(
              `Deal API returned status ${response.status} for "${newItem.productName}"`,
            );
          }
        } catch (apiError) {
          clearTimeout(timeoutId);
          if (apiError.name === "AbortError") {
            console.warn(
              `Deal checking timed out for "${newItem.productName}"`,
            );
          } else {
            throw apiError;
          }
        }
      } catch (error) {
        // Silently handle deal checking errors to prevent blocking item addition
        console.warn(
          `Deal checking failed for "${newItem.productName}" but item was added successfully`,
        );
      }
    }, 100); // Small delay to ensure item addition completes first
  };

  // Helper function to get retailer color (using proper CSS color values)
  const getRetailerColor = (retailerId: number) => {
    const retailerColors: Record<number, string> = {
      1: "#3b82f6", // Walmart (Blue)
      2: "#ef4444", // Target (Red)
      3: "#22c55e", // Whole Foods (Green)
      4: "#6366f1", // Costco (Indigo)
      5: "#a855f7", // Kroger (Purple)
    };
    return retailerColors[retailerId] || "#6b7280"; // Default to gray
  };

  // Helper function to get retailer name
  const getRetailerName = (retailerId: number) => {
    const retailerMap: Record<number, string> = {
      1: "Walmart",
      2: "Target",
      3: "Whole Foods",
      4: "Costco",
      5: "Kroger",
    };
    return retailerMap[retailerId] || "Store";
  };

  // DealIndicator Component with real deal detection and popover
  const DealIndicator: React.FC<{ productName: string; itemId: number }> = ({
    productName,
    itemId,
  }) => {
    const [isLoading, setIsLoading] = useState(false);

    // Check if there are deals for this item
    if (!itemDeals[itemId] || itemDeals[itemId].length === 0) {
      return null;
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full bg-red-100 hover:bg-red-200 text-red-600 relative"
          >
            <Tag className="h-3 w-3" />
            {itemDeals[itemId].length > 1 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {itemDeals[itemId].length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-sm">Available Deals</span>
              {itemDeals[itemId].length > 1 && (
                <Badge variant="outline" className="text-xs">
                  {itemDeals[itemId].length} stores
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {itemDeals[itemId].map((deal: any, index: number) => (
                <div
                  key={index}
                  className={`border rounded-lg p-3 ${index === 0 ? "bg-green-50 border-green-200" : "bg-gray-50"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full`}
                        style={{
                          backgroundColor: getRetailerColor(
                            deal.retailerId,
                          ).replace("bg-", "#"),
                        }}
                      />
                      <span className="font-medium text-sm">
                        {getRetailerName(deal.retailerId)}
                      </span>
                      {index === 0 && itemDeals[itemId].length > 1 && (
                        <Badge
                          variant="default"
                          className="text-xs bg-green-600"
                        >
                          Best Deal
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        index === 0
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {deal.dealType === "spend_threshold_percentage"
                        ? `${deal.discountPercentage}% off`
                        : `${Math.round((1 - deal.salePrice / deal.regularPrice) * 100)}% off`}
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    <strong>{deal.productName}</strong>
                  </div>

                  {deal.dealType === "spend_threshold_percentage" ? (
                    <div className="text-sm">
                      <span className="text-gray-700">
                        Spend ${(deal.spendThreshold / 100).toFixed(0)}+
                      </span>
                      <span className="text-green-600 font-medium ml-1">
                        Get {deal.discountPercentage}% off
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-green-600">
                        ${(deal.salePrice / 100).toFixed(2)}
                      </span>
                      <span className="text-gray-500 line-through">
                        ${(deal.regularPrice / 100).toFixed(2)}
                      </span>
                      <span className="text-green-600 font-medium">
                        Save $
                        {((deal.regularPrice - deal.salePrice) / 100).toFixed(
                          2,
                        )}
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-1">
                    Valid until {new Date(deal.endDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {itemDeals[itemId].length > 1 && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-blue-700">
                  <MapPin className="h-3 w-3" />
                  <span>
                    Compare prices across {itemDeals[itemId].length} retailers
                    to maximize savings
                  </span>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const SpendThresholdTracker: React.FC<{ currentTotal: number }> = ({
    currentTotal,
  }) => {
    const [thresholdReached, setThresholdReached] = useState(false);
    const threshold = 50; // Define your spend threshold

    useEffect(() => {
      if (currentTotal >= threshold) {
        setThresholdReached(true);
      } else {
        setThresholdReached(false);
      }
    }, [currentTotal, threshold]);

    if (thresholdReached) {
      return (
        <div className="text-green-600 font-semibold">
          Congratulations! You've reached the spend threshold of ${threshold}.
        </div>
      );
    }

    return (
      <div className="text-gray-600">
        Spend $
        {threshold - currentTotal > 0
          ? (threshold - currentTotal).toFixed(2)
          : "0.00"}{" "}
        more to unlock extra benefits!
      </div>
    );
  };

  const {
    data: shoppingList,
    isLoading: listLoading,
    refetch: refetchShoppingList,
  } = useQuery({
    queryKey: ["/api/shopping-list"],
  });

  const totalCost =
    shoppingList?.items?.reduce((sum, item) => {
      return sum + (item.suggestedPrice || 0);
    }, 0) / 100 || 0;

  return (
    <div className="p-4 pb-20">
      <h2 className="text-xl font-bold mb-4">Shopping List</h2>

      {/* Categorized Shopping List */}
      {isCategorizingItems && (
        <div className="flex items-center justify-center py-4 text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          <span>Categorizing items...</span>
        </div>
      )}

      {Object.keys(categorizedItems).length > 0 && !isCategorizingItems && (
        <div className="space-y-3">
          {Object.entries(categorizedItems)
            .sort(([a], [b]) => {
              // Sort categories by typical shopping order
              const order = [
                "Produce",
                "Dairy & Eggs",
                "Meat & Seafood",
                "Pantry & Canned Goods",
                "Frozen Foods",
                "Bakery",
                "Personal Care",
                "Household Items",
                "Generic",
              ];
              const indexA = order.indexOf(a);
              const indexB = order.indexOf(b);

              // If both categories are in the predefined order, sort by that order
              if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
              }

              // If only one is in the predefined order, prioritize it
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;

              // If neither is in the predefined order, sort alphabetically
              return a.localeCompare(b);
            })
            .map(([category, categoryItems]) => {
              // Sort items within each category alphabetically
              const sortedCategoryItems = [...categoryItems].sort((a, b) => {
                const nameA = (a.productName || "").toString().toLowerCase();
                const nameB = (b.productName || "").toString().toLowerCase();
                return nameA.localeCompare(nameB, undefined, {
                  numeric: true,
                  sensitivity: "base",
                });
              });
              return [category, sortedCategoryItems];
            })
            .map(([category, sortedCategoryItems]) => {
              const config = categoryConfig[
                category as keyof typeof categoryConfig
              ] || {
                icon: "🛒",
                color: "bg-gray-100 text-gray-800 border-gray-200",
              };
              const isCollapsed = collapsedCategories[category];
              const completedCount = sortedCategoryItems.filter(
                (item) => item.completed,
              ).length;
              const totalCount = sortedCategoryItems.length;

              return (
                <Collapsible
                  key={category}
                  open={!isCollapsed}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <Card
                    className={`border-2 ${config.color.split(" ")[0]} border-opacity-30`}
                  >
                    <CollapsibleTrigger className="w-full">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{config.icon}</span>
                            <div className="text-left">
                              <h3 className="font-semibold text-lg">
                                {category}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {isCollapsed ? (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-2">
                        {sortedCategoryItems.map((item) => (
                          <Card
                            key={item.id}
                            className={`${item.completed ? "opacity-60" : ""} border border-gray-200`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span
                                        className={`${item.completed ? "line-through" : ""}`}
                                      >
                                        {item.productName}
                                      </span>
                                      <DealIndicator
                                        productName={item.productName}
                                        itemId={item.id}
                                      />
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {item.quantity} {item.unit || "COUNT"}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditItem(item)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteItem(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
        </div>
      )}

      {/* Fallback for uncategorized view */}
      {Object.keys(categorizedItems).length === 0 &&
        !isCategorizingItems &&
        shoppingLists?.[0]?.items &&
        shoppingLists[0].items.length > 0 && (
          <div className="space-y-2">
            {[...shoppingLists[0].items]
              .sort((a, b) => {
                const nameA = (a.productName || "").toString().toLowerCase();
                const nameB = (b.productName || "").toString().toLowerCase();
                return nameA.localeCompare(nameB, undefined, {
                  numeric: true,
                  sensitivity: "base",
                });
              })
              .map((item) => (
                <Card
                  key={item.id}
                  className={`${item.completed ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`${item.completed ? "line-through" : ""}`}
                            >
                              {item.productName}
                            </span>
                            <DealIndicator
                              productName={item.productName}
                              itemId={item.id}
                            />
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.quantity} {item.unit || "COUNT"}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

      {(!shoppingLists?.[0]?.items || shoppingLists[0].items.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Your shopping list is empty</p>
          <p className="text-sm">Add items below to get started</p>
        </div>
      )}

      <form onSubmit={handleAddItem} className="mb-4">
        <Card className="bg-white rounded-lg shadow-md border border-gray-200">
          <CardContent className="p-4 space-y-4">
            {/* Item Name Input */}
            <div>
              <Input
                type="text"
                placeholder="Add item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="h-12 text-base border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white rounded-lg transition-all duration-200"
              />
            </div>

            {/* Quantity and Unit Row */}
            <div className="flex space-x-3">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="1"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  min="1"
                  className="h-11 text-base border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white rounded-lg transition-all duration-200"
                />
              </div>

              <div className="flex-1">
                <select
                  value={newItemUnit}
                  onChange={(e) =>
                    setNewItemUnit(e.target.value as ShoppingListItem["unit"])
                  }
                  className="w-full h-11 text-base border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white rounded-lg transition-all duration-200 cursor-pointer px-3"
                >
                  <option value="BAG">Bag</option>
                  <option value="BARREL">Barrel</option>
                  <option value="BASKET">Basket</option>
                  <option value="BLOCK">Block</option>
                  <option value="BOTTLE">Bottle</option>
                  <option value="BOTTLES">Bottles</option>
                  <option value="BOX">Box</option>
                  <option value="BUCKET">Bucket</option>
                  <option value="BUNCH">Bunch</option>
                  <option value="BUNDLE">Bundle</option>
                  <option value="CAN">Can</option>
                  <option value="CARTON">Carton</option>
                  <option value="CASE">Case</option>
                  <option value="CLOVE">Clove</option>
                  <option value="CONTAINER">Container</option>
                  <option value="COUNT">Count</option>
                  <option value="CRATE">Crate</option>
                  <option value="CUP">Cup</option>
                  <option value="DOZEN">Dozen</option>
                  <option value="GALLON">Gallon</option>
                  <option value="GRAMS">Grams</option>
                  <option value="HEAD">Head</option>
                  <option value="JAR">Jar</option>
                  <option value="KG">Kilogram</option>
                  <option value="LB">Pound</option>
                  <option value="LITER">Liter</option>
                  <option value="LOAF">Loaf</option>
                  <option value="ML">Milliliter</option>
                  <option value="OZ">Ounce</option>
                  <option value="PACK">Pack</option>
                  <option value="PACKAGE">Package</option>
                  <option value="PIECE">Piece</option>
                  <option value="PINT">Pint</option>
                  <option value="QUART">Quart</option>
                  <option value="ROLL">Roll</option>
                  <option value="SACK">Sack</option>
                  <option value="SHEET">Sheet</option>
                  <option value="SLICE">Slice</option>
                  <option value="STICK">Stick</option>
                  <option value="TBSP">Tablespoon</option>
                  <option value="TRAY">Tray</option>
                  <option value="TSP">Teaspoon</option>
                  <option value="TUBE">Tube</option>
                </select>
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex flex-col space-y-3">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRecipeDialogOpen(true)}
                  className="flex-1 h-11 flex items-center justify-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Import Recipe</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRegenerateList}
                  disabled={regenerateListMutation.isPending}
                  className="flex-1 h-11 flex items-center justify-center space-x-2"
                >
                  <Wand2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Regenerate List</span>
                </Button>
              </div>

              <Button
                type="submit"
                disabled={!newItemName.trim() || addItemMutation.isPending}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-5 w-5" />
                <span className="text-base font-medium">Add Item</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {shoppingList && shoppingList.items && shoppingList.items.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">
                Ready to Shop?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {shoppingList.items.length} items • Estimated total: $
                {totalCost.toFixed(2)}
              </p>
              <SpendThresholdTracker currentTotal={totalCost} />
              <Button
                onClick={() => (window.location.href = "/plan-details")}
                className="w-full bg-primary hover:bg-primary/90 mt-2"
              >
                Create Shopping Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipe Import Dialog */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipe-url">Recipe URL</Label>
              <Input
                id="recipe-url"
                placeholder="https://example.com/recipe"
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min="1"
                max="20"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            ```
            <Button
              variant="outline"
              onClick={() => setRecipeDialogOpen(false)}
              className="mt-3 sm:mt-0"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportRecipe}
              disabled={importRecipeMutation.isPending || !recipeUrl.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {importRecipeMutation.isPending
                ? "Importing..."
                : "Import Recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Item Name</Label>
              <Input
                id="edit-name"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                value={editingQuantity}
                onChange={(e) => setEditingQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-unit">Unit</Label>
              <select
                id="edit-unit"
                value={editingUnit}
                onChange={(e) =>
                  setEditingUnit(e.target.value as ShoppingListItem["unit"])
                }
                className="w-full h-10 text-base border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white rounded-lg transition-all duration-200 cursor-pointer px-3"
              >
                <option value="BAG">Bag</option>
                <option value="BARREL">Barrel</option>
                <option value="BASKET">Basket</option>
                <option value="BLOCK">Block</option>
                <option value="BOTTLE">Bottle</option>
                <option value="BOTTLES">Bottles</option>
                <option value="BOX">Box</option>
                <option value="BUCKET">Bucket</option>
                <option value="BUNCH">Bunch</option>
                <option value="BUNDLE">Bundle</option>
                <option value="CAN">Can</option>
                <option value="CARTON">Carton</option>
                <option value="CASE">Case</option>
                <option value="CLOVE">Clove</option>
                <option value="CONTAINER">Container</option>
                <option value="COUNT">Count</option>
                <option value="CRATE">Crate</option>
                <option value="CUP">Cup</option>
                <option value="DOZEN">Dozen</option>
                <option value="GALLON">Gallon</option>
                <option value="GRAMS">Grams</option>
                <option value="HEAD">Head</option>
                <option value="JAR">Jar</option>
                <option value="KG">Kilogram</option>
                <option value="LB">Pound</option>
                <option value="LITER">Liter</option>
                <option value="LOAF">Loaf</option>
                <option value="ML">Milliliter</option>
                <option value="OZ">Ounce</option>
                <option value="PACK">Pack</option>
                <option value="PACKAGE">Package</option>
                <option value="PIECE">Piece</option>
                <option value="PINT">Pint</option>
                <option value="QUART">Quart</option>
                <option value="ROLL">Roll</option>
                <option value="SACK">Sack</option>
                <option value="SHEET">Sheet</option>
                <option value="SLICE">Slice</option>
                <option value="STICK">Stick</option>
                <option value="TBSP">Tablespoon</option>
                <option value="TRAY">Tray</option>
                <option value="TSP">Teaspoon</option>
                <option value="TUBE">Tube</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                value={editingCategory}
                onChange={(e) => setEditingCategory(e.target.value)}
                className="w-full h-10 text-base border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white rounded-lg transition-all duration-200 cursor-pointer px-3"
              >
                <option value="Produce">🍎 Produce</option>
                <option value="Dairy & Eggs">🥛 Dairy & Eggs</option>
                <option value="Meat & Seafood">🥩 Meat & Seafood</option>
                <option value="Pantry & Canned Goods">
                  🥫 Pantry & Canned Goods
                </option>
                <option value="Frozen Foods">❄️ Frozen Foods</option>
                <option value="Bakery">🍞 Bakery</option>
                <option value="Personal Care">🧼 Personal Care</option>
                <option value="Household Items">🏠 Household Items</option>
                <option value="Generic">🛒 Generic</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateItem}
              disabled={updateItemMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voice AI Agent - Moved to bottom */}
      <div className="mt-6 mb-4">
        <VoiceAgent
          onAddItem={handleVoiceAddItem}
          onToggleItem={handleVoiceToggleItem}
          onDeleteItem={handleVoiceDeleteItem}
          isProcessing={
            addItemMutation.isPending ||
            toggleItemMutation.isPending ||
            deleteItemMutation.isPending
          }
        />
      </div>
    </div>
  );
};

export default ShoppingListComponent;
