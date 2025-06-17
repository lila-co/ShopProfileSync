
# SmartCart App Wireframe

## 📱 Mobile-First Design Overview

SmartCart is designed with a mobile-first approach, featuring a clean, intuitive interface optimized for both tech-savvy users and elderly users who prefer minimal clicking.

---

## 🏠 Main Dashboard (`/`)

```
┌─────────────────────────────────────┐
│ ☰  SmartCart           🔔 👤       │ ← Header
├─────────────────────────────────────┤
│                                     │
│ 📊 Shopping Insights                │
│ ┌─────────────────────────────────┐ │
│ │ This Week: $127.43              │ │
│ │ Budget Adherence: 85% ████▒▒▒   │ │
│ │ Most Frequent Store: Target     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🎯 Quick Actions                    │
│ ┌───────┐ ┌───────┐ ┌───────┐     │
│ │  📱   │ │  📝   │ │  💰   │     │
│ │ Scan  │ │ Lists │ │ Deals │     │
│ │Receipt│ │       │ │       │     │
│ └───────┘ └───────┘ └───────┘     │
│                                     │
│ 🛍️ Recommendations                  │
│ ┌─────────────────────────────────┐ │
│ │ 🥛 Milk - Due in 2 days        │ │
│ │ 💰 $3.29 at Walmart (Save $0.50)│ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🏪 Area Shopping Trends             │
│ ┌─────────────────────────────────┐ │
│ │ Families in your area buy 20%   │ │
│ │ more organic produce this month │ │
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│ 📝 💰 📅 🏪 👤                    │ ← Bottom Nav
└─────────────────────────────────────┘
```

---

## 📝 Shopping List (`/shopping-list`)

```
┌─────────────────────────────────────┐
│ ← Shopping List        ⋮  + Add     │
├─────────────────────────────────────┤
│                                     │
│ 🛒 My Shopping List (16 items)      │
│                                     │
│ 🥬 Produce                          │
│ ┌─────────────────────────────────┐ │
│ │ ☐ 🍌 Bananas - 3 lb            │ │
│ │     Target • $1.99/lb           │ │
│ │ ☐ 🥬 Baby Spinach - 1 bag      │ │
│ │     Target • $2.49              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🥛 Dairy & Eggs                     │
│ ┌─────────────────────────────────┐ │
│ │ ☐ 🥛 Organic Milk - 1 gallon   │ │
│ │     Target • $4.29              │ │
│ │ ☐ 🥚 Free-Range Eggs - 2 dozen │ │
│ │     Target • $3.58              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🍞 Bakery                           │
│ ┌─────────────────────────────────┐ │
│ │ ☐ 🍞 Whole Wheat Bread - 1 loaf│ │
│ │     Target • $2.99              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Total: $47.83                   │ │
│ │ ┌──────────┐ ┌─────────────────┐│ │
│ │ │Best Value│ │  Start Shopping ││ │
│ │ └──────────┘ └─────────────────┘│ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📝 💰 📅 🏪 👤                    │
└─────────────────────────────────────┘
```

---

## 🛣️ Shopping Route (`/shopping-route`)

```
┌─────────────────────────────────────┐
│ ← Shopping Route       ⏱️ 0:00     │
├─────────────────────────────────────┤
│                                     │
│ 🏪 Target - Store Layout            │
│ Est. Time: 25-30 min                │
│                                     │
│ 📍 Aisle 1 - Fresh Produce         │
│ ┌─────────────────────────────────┐ │
│ │ ✅ Baby Spinach (Found!)        │ │
│ │ ☐ Bananas - Near entrance      │ │
│ │ ☐ Avocados - End cap display   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📍 Aisle 3 - Dairy & Eggs          │
│ ┌─────────────────────────────────┐ │
│ │ ☐ Organic Milk - Back wall     │ │
│ │ ☐ Free-Range Eggs - Middle     │ │
│ │ ☐ Greek Yogurt - End section   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📍 Aisle 7 - Bakery                │
│ ┌─────────────────────────────────┐ │
│ │ ☐ Whole Wheat Bread            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Items Found: 1/16               │ │
│ │ ████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ 6%        │ │
│ │ ┌──────────┐ ┌─────────────────┐│ │
│ │ │ Mark Item│ │   Next Aisle    ││ │
│ │ └──────────┘ └─────────────────┘│ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📝 💰 📅 🏪 👤                    │
└─────────────────────────────────────┘
```

---

## 💰 Deals (`/deals`)

```
┌─────────────────────────────────────┐
│ 🔍 Weekly Deals        📅 Filter   │
├─────────────────────────────────────┤
│                                     │
│ 🏪 This Week's Best Deals           │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🎯 Target - Weekly Circular     │ │
│ │ ┌─────┐ 🥛 Milk Gallon         │ │
│ │ │50%  │ Was: $4.99             │ │
│ │ │OFF  │ Now: $2.49             │ │
│ │ └─────┘ Valid: Jan 15-21       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🛒 Walmart - Price Match        │ │
│ │ ┌─────┐ 🍞 Bread 2-Pack        │ │
│ │ │$3   │ Regular: $5.98         │ │
│ │ │SAVE │ Sale: $2.98            │ │
│ │ └─────┘ Limited Time           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🏪 Kroger - Digital Coupon      │ │
│ │ ┌─────┐ 🥚 Eggs Dozen          │ │
│ │ │BOGO │ Buy 1 Get 1 Free       │ │
│ │ │FREE │ With Card              │ │
│ │ └─────┘ Clip to Save           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Upload Store Circular           │ │
│ │ 📸 Take Photo or Upload PDF     │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📝 💰 📅 🏪 👤                    │
└─────────────────────────────────────┘
```

---

## 📱 Receipt Scanner (`/scan`)

```
┌─────────────────────────────────────┐
│ ← Receipt Scanner      💡 Tips      │
├─────────────────────────────────────┤
│                                     │
│ 📸 Scan Your Receipt                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │        📷 Camera View           │ │
│ │                                 │ │
│ │    ┌─────────────────────┐      │ │
│ │    │                     │      │ │
│ │    │   Receipt Scanner   │      │ │
│ │    │                     │      │ │
│ │    │   Align receipt     │      │ │
│ │    │   within frame      │      │ │
│ │    │                     │      │ │
│ │    └─────────────────────┘      │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💡 Tips for Best Results:       │ │
│ │ • Ensure good lighting          │ │
│ │ • Keep receipt flat             │ │
│ │ • Include store name & totals   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌───────────┐ ┌─────────────────────┐│
│ │📁 Gallery │ │   🔵 Capture       ││
│ └───────────┘ └─────────────────────┘│
│                                     │
│ Recent Scans:                       │
│ • Target - $47.83 (Today)          │
│ • Walmart - $23.45 (Yesterday)     │
├─────────────────────────────────────┤
│ 📝 💰 📅 🏪 👤                    │
└─────────────────────────────────────┘
```

---

## 🏪 Retailers (`/retailers`)

```
┌─────────────────────────────────────┐
│ 🏪 My Stores           + Link Store │
├─────────────────────────────────────┤
│                                     │
│ 🔗 Linked Accounts                  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🎯 Target                       │ │
│ │ ● Connected                     │ │
│ │ Last sync: 2 hours ago          │ │
│ │ Account: john.doe@email.com     │ │
│ │ ┌──────────┐ ┌─────────────────┐│ │
│ │ │   Sync   │ │    Disconnect   ││ │
│ │ └──────────┘ └─────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🛒 Walmart                      │ │
│ │ ○ Not Connected                 │ │
│ │ Support: Online ordering        │ │
│ │ Distance: 2.3 miles             │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │         Connect             │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🏪 Nearby Stores                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🥬 Kroger                       │ │
│ │ ○ Available to link             │ │
│ │ Distance: 1.8 miles             │ │
│ │ Features: Pickup, Delivery      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🍎 Whole Foods                  │ │
│ │ ○ Available to link             │ │
│ │ Distance: 3.1 miles             │ │
│ │ Features: Organic focus         │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📝 💰 📅 🏪 👤                    │
└─────────────────────────────────────┘
```

---

## 👤 Profile (`/profile`)

```
┌─────────────────────────────────────┐
│ ← Profile              ⚙️ Settings  │
├─────────────────────────────────────┤
│                                     │
│ 👤 John Doe                         │
│ john.doe@email.com                  │
│ Member since: Jan 2024              │
│                                     │
│ 📊 Your Shopping Profile            │
│ ┌─────────────────────────────────┐ │
│ │ Household Type: Family (4)      │ │
│ │ Budget Style: Budget-conscious  │ │
│ │ Brand Preference: Mix of both   │ │
│ │ Shopping Frequency: Weekly      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🛍️ Shopping Patterns               │
│ ┌─────────────────────────────────┐ │
│ │ Preferred Day: Saturday         │ │
│ │ Preferred Time: Morning         │ │
│ │ Favorite Store: Target          │ │
│ │ Budget Adherence: 87%           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🔗 Account Settings                 │
│ • Notification Preferences         │
│ • Privacy Settings                  │
│ • Data Export                       │
│ • Delete Account                    │
│                                     │
│ 🏪 Linked Retailers (2)             │
│ • Target ✓                         │
│ • Walmart ○                        │
│                                     │
│ 📱 App Preferences                  │
│ • Theme: Auto (Light/Dark)         │
│ • Voice Assistant: Enabled         │
│ • Push Notifications: Enabled      │
├─────────────────────────────────────┤
│ 📝 💰 📅 🏪 👤                    │
└─────────────────────────────────────┘
```

---

## 🎯 Recommendations (`/recommendations`)

```
┌─────────────────────────────────────┐
│ ← Recommendations      🔄 Refresh   │
├─────────────────────────────────────┤
│                                     │
│ 🤖 AI Recommendations               │
│                                     │
│ 🚨 Running Low                      │
│ ┌─────────────────────────────────┐ │
│ │ 🥛 Milk                         │ │
│ │ Usually buy every 4 days        │ │
│ │ Last purchased: 3 days ago      │ │
│ │ 💰 Best price: $3.29 at Walmart │ │
│ │ ┌──────────┐ ┌─────────────────┐│ │
│ │ │Add to List│ │   Set Reminder  ││ │
│ │ └──────────┘ └─────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │
│ 💡 Smart Suggestions                │
│ ┌─────────────────────────────────┐ │
│ │ 🍌 Bananas                      │ │
│ │ Based on past purchases         │ │
│ │ Perfect time to buy: Now        │ │
│ │ 💰 Great deal: $0.58/lb Target  │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │        Add to List          │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🏪 Store-Specific Deals             │
│ ┌─────────────────────────────────┐ │
│ │ 🎯 Target Circle Offers         │ │
│ │ 🥚 Eggs - 25% off with app     │ │
│ │ 🍞 Bread - Buy 2, Save $1      │ │
│ │ Valid through Sunday            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🌟 Trending in Your Area           │
│ ┌─────────────────────────────────┐ │
│ │ Families are buying 30% more:   │ │
│ │ • Organic produce               │ │
│ │ • Plant-based alternatives     │ │
│ │ • Healthy snacks               │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📝 💰 📅 🏪 👤                    │
└─────────────────────────────────────┘
```

---

## 🔐 Authentication (`/auth`)

```
┌─────────────────────────────────────┐
│            SmartCart                │
├─────────────────────────────────────┤
│                                     │
│    🛒 Smart Shopping, Simplified    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │              Login              │ │
│ │                                 │ │
│ │ Email                           │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ john.doe@email.com          │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ Password                        │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ ••••••••                    │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ ☐ Remember me                  │ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │           Sign In           │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │        Forgot Password?         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Don't have an account?              │
│ ┌─────────────────────────────────┐ │
│ │           Sign Up               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │    🔍 Continue as Guest        │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## 📋 Auto Order (`/auto-order`)

```
┌─────────────────────────────────────┐
│ ← Auto Order           ⚙️ Settings  │
├─────────────────────────────────────┤
│                                     │
│ 🤖 Analyzing Your Shopping List...  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Step 1: Finding Best Prices     │ │
│ │ ████████████████▒▒▒▒ 80%        │ │
│ │                                 │ │
│ │ ✅ Compared 12 stores           │ │
│ │ ✅ Found 23 price matches       │ │
│ │ 🔄 Checking seasonal trends     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 💡 Optimization Options             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💰 Best Value Plan              │ │
│ │ Total: $41.27 (Save $8.93)     │ │
│ │ Stores: 3 different locations   │ │
│ │ Time: 45-60 minutes             │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │       Select Plan           │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⚖️ Balanced Plan                │ │
│ │ Total: $45.83 (Save $4.37)     │ │
│ │ Stores: 1 main + 1 specialty   │ │
│ │ Time: 25-35 minutes             │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │       Select Plan           │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⏱️ Convenience Plan             │ │
│ │ Total: $50.20 (Original price)  │ │
│ │ Stores: 1 location only         │ │
│ │ Time: 15-20 minutes             │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │       Select Plan           │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📝 💰 📅 🏪 👤                    │
└─────────────────────────────────────┘
```

---

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#0066CC) - Trust and reliability
- **Secondary**: Green (#00AA44) - Savings and success
- **Warning**: Orange (#FF8800) - Alerts and notifications
- **Error**: Red (#CC0000) - Errors and urgent actions
- **Background**: White (#FFFFFF) / Dark (#1A1A1A)
- **Text**: Gray scale (#333333 to #999999)

### Typography
- **Headers**: Bold, 18-24px
- **Body**: Regular, 14-16px
- **Small text**: Regular, 12-14px
- **Font**: System fonts for better performance

### Key Features
1. **Large touch targets** (minimum 44px) for accessibility
2. **High contrast** text for readability
3. **Simple navigation** with clear icons and labels
4. **Minimal steps** to complete common tasks
5. **Voice assistant** integration for hands-free usage
6. **Progressive disclosure** to avoid overwhelming users

---

## 📱 Responsive Breakpoints

- **Mobile**: 320px - 768px (Primary focus)
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+ (Secondary consideration)

This wireframe demonstrates SmartCart's focus on simplifying the shopping experience through intelligent automation, clear visual hierarchy, and user-friendly interface design suitable for all user demographics.

