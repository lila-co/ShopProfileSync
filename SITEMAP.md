
# SmartCart - Visual Sitemap

## 📱 Main Application Pages

### 🏠 **Dashboard** (`/`)
- **File**: `pages/dashboard.tsx`
- **Status**: ✅ Active
- **Features**: Shopping insights, recommendations, action cards, weekly deals

### 🛒 **Shopping List** (`/shopping-list`)
- **File**: `pages/shopping-list.tsx`
- **Status**: ⚠️ Has errors (regenerateListMutation not found)
- **Features**: Add/edit items, list management, retailer suggestions

### 🔍 **Scan Receipts** (`/scan`)
- **File**: `pages/scan.tsx`
- **Status**: ✅ Active
- **Features**: Receipt scanner, OCR processing, purchase tracking

### 💰 **Deals** (`/deals`)
- **File**: `pages/deals.tsx`
- **Status**: ✅ Active
- **Features**: Weekly deals, circular uploads, deal categories

### 🏪 **Retailers** (`/retailers`)
- **File**: `pages/retailers.tsx`
- **Status**: ✅ Active
- **Features**: Retailer list, store linking, account management

### 🎯 **Recommendations** (`/recommendations`)
- **File**: `pages/recommendations.tsx`
- **Status**: ✅ Active
- **Features**: AI-powered product suggestions, personalized recommendations

### 👤 **Profile** (`/profile`)
- **File**: `pages/profile.tsx`
- **Status**: ✅ Active
- **Features**: User settings, preferences, retailer linking

### 🔐 **Authentication** (`/auth`)
- **File**: `pages/auth.tsx`
- **Status**: ✅ Active
- **Features**: Login/register forms

## 🛍️ Shopping Features

### 🛒 **Shop** (`/shop`)
- **File**: `pages/shop.tsx`
- **Status**: ✅ Active
- **Features**: Product browsing, shopping interface

### 🗺️ **Shopping Route** (`/shopping-route`)
- **File**: `pages/shopping-route.tsx`
- **Status**: ✅ Active
- **Features**: Optimized shopping routes, store navigation

### ⏰ **Auto Order** (`/auto-order`)
- **File**: `pages/auto-order.tsx`
- **Status**: ✅ Active
- **Features**: Automated recurring orders

### 📅 **Expiration Tracker** (`/expiration-tracker`)
- **File**: `pages/expiration-tracker.tsx`
- **Status**: ✅ Active
- **Features**: Track product expiration dates

### 📰 **Circulars** (`/circulars`)
- **File**: `pages/circulars.tsx`
- **Status**: ✅ Active
- **Features**: Store circulars, promotional flyers

## 🏪 Retailer Features

### 🏪 **Retailer Details** (`/retailer/:id`)
- **File**: `pages/retailer-details.tsx`
- **Status**: ✅ Active
- **Features**: Individual retailer information, deals, products

### 📋 **Plan Details** (`/plan/:id`)
- **File**: `pages/plan-details.tsx`
- **Status**: ✅ Active
- **Features**: Shopping plan details, itinerary

## 🔧 Admin & Analytics

### 📊 **Internal Analytics** (`/internal/analytics`)
- **File**: `pages/internal-analytics.tsx`
- **Status**: ✅ Active
- **Features**: Purchase patterns, demographic trends, business intelligence

### 👥 **Admin Profile** (`/admin/profile`)
- **File**: `pages/admin-profile.tsx`
- **Status**: ✅ Active
- **Features**: Admin user management

### ⚙️ **Admin Settings** (`/admin/settings`)
- **File**: `pages/admin-settings.tsx`
- **Status**: ✅ Active
- **Features**: System configuration, admin controls

### 🤝 **Affiliate Dashboard** (`/affiliate`)
- **File**: `pages/affiliate-dashboard.tsx`
- **Status**: ✅ Active
- **Features**: Partner management, commission tracking

## 🚫 Error Pages

### ❌ **404 Not Found**
- **File**: `pages/not-found.tsx`
- **Status**: ✅ Active
- **Features**: Custom 404 error page

## 🚨 Current Issues

1. **Shopping List Page**: Has JavaScript errors related to `regenerateListMutation`
2. **All pages seem functional** except for the shopping list issue

## 📱 Navigation Structure

```
Header Navigation:
├── Dashboard (/)
├── Scan (/scan)
├── Lists (/shopping-list)
├── Deals (/deals)
├── Retailers (/retailers)
└── Profile (/profile)

Bottom Navigation (Mobile):
├── Home (/)
├── Scan (/scan)
├── Lists (/shopping-list)
├── Deals (/deals)
└── Profile (/profile)
```

## 🎨 Design Notes

- **Mobile-first design** with responsive layouts
- **shadcn/ui components** for consistent styling
- **Dark/light theme support**
- **Tailwind CSS** for styling
- **Modern React patterns** with hooks and context
