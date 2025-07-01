import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User } from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { profileUpdateSchema } from '@/lib/validation';
import { validateAndSubmit, handleFormError } from '@/lib/formValidation';

const profileFormSchema = profileUpdateSchema.extend({
  householdType: z.enum(['SINGLE', 'COUPLE', 'FAMILY_WITH_CHILDREN', 'SHARED_HOUSING', 'SENIOR_LIVING'], {
    required_error: 'Please select a household type',
  }),
  householdSize: z.number({
    required_error: 'Please select household size',
    invalid_type_error: 'Household size must be a number',
  }).int('Household size must be a whole number').min(1, 'Household size must be at least 1').max(20, 'Household size must be no more than 20'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const ProfileSetup: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user profile
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  // Setup form with default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      householdType: user?.householdType || '',
      householdSize: user?.householdSize || 1,
      preferNameBrand: user?.preferNameBrand || false,
      preferOrganic: user?.preferOrganic || false,
      buyInBulk: user?.buyInBulk || false,
      prioritizeCostSavings: user?.prioritizeCostSavings || false,
      shoppingRadius: user?.shoppingRadius || 5,
    },
  });

  // Update when user data loads
  React.useEffect(() => {
    if (user) {
      form.reset({
        householdType: user?.householdType || '',
        householdSize: user?.householdSize || 1,
        preferNameBrand: user?.preferNameBrand || false,
        preferOrganic: user?.preferOrganic || false,
        buyInBulk: user?.buyInBulk || false,
        prioritizeCostSavings: user?.prioritizeCostSavings || false,
        shoppingRadius: user?.shoppingRadius || 5,
      });
    }
  }, [user]);

  // Handle form submission
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const response = await apiRequest('PATCH', '/api/user/profile', values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated."
      });
      navigate('/');
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: ProfileFormValues) => {
    // Ensure householdSize is a number
    const formattedValues = {
      ...values,
      householdSize: typeof values.householdSize === 'string' ? 
        parseInt(values.householdSize, 10) : values.householdSize
    };
    updateProfileMutation.mutate(formattedValues);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-center">Complete Your Profile</h2>
        </div>
        <div className="space-y-4">
          {Array(5).fill(0).map((_, index) => (
            <div key={index} className="space-y-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-center">Complete Your Profile</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Help us personalize your shopping recommendations by providing some information about your household.
      </p>

      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit(onSubmit)(e);
      }}>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Household Type</label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-700"
              {...form.register("householdType")}
            >
              <option value="">Select household type</option>
              <option value="SINGLE">Single Person</option>
              <option value="COUPLE">Couple</option>
              <option value="FAMILY_WITH_CHILDREN">Family with Children</option>
              <option value="SHARED_HOUSING">Shared Housing</option>
              <option value="SENIOR_LIVING">Senior Living</option>
            </select>
            {form.formState.errors.householdType && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.householdType.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of People</label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-700"
              {...form.register("householdSize", { valueAsNumber: true })}
            >
              <option value="">Select number</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5+</option>
            </select>
            {form.formState.errors.householdSize && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.householdSize.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shopping Preferences</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="preferNameBrand" 
                  className="h-4 w-4 text-primary"
                  {...form.register("preferNameBrand")}
                />
                <label htmlFor="preferNameBrand" className="ml-2 text-sm text-gray-700">I prefer name-brand products</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="preferOrganic" 
                  className="h-4 w-4 text-primary"
                  {...form.register("preferOrganic")}
                />
                <label htmlFor="preferOrganic" className="ml-2 text-sm text-gray-700">I prefer organic products</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="buyInBulk" 
                  className="h-4 w-4 text-primary"
                  {...form.register("buyInBulk")}
                />
                <label htmlFor="buyInBulk" className="ml-2 text-sm text-gray-700">I buy in bulk when possible</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="prioritizeCostSavings" 
                  className="h-4 w-4 text-primary"
                  {...form.register("prioritizeCostSavings")}
                />
                <label htmlFor="prioritizeCostSavings" className="ml-2 text-sm text-gray-700">I prioritize cost savings</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shopping Radius: {form.watch("shoppingRadius") ?? 5} miles
            </label>
            <div className="relative">
              <input 
                type="range" 
                min="1" 
                max="20" 
                step="1"
                className="w-full"
                {...form.register("shoppingRadius", { valueAsNumber: true })}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 mile</span>
                <span>5 miles</span>
                <span>10 miles</span>
                <span>20 miles</span>
              </div>
            </div>
          </div>

          <button 
          type="submit" 
          className="w-full py-3 bg-primary text-white rounded-lg font-medium mt-6"
          disabled={updateProfileMutation.isPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit(onSubmit)();
          }}
        >
          {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default ProfileSetup;