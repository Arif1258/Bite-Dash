/**
 * BiteDash OpenAI Tool / Function Calling Definitions
 *
 * Strict JSON Schema definitions for all backend capabilities exposed to the LLM.
 * The model NEVER receives raw database access, and user identity is NEVER
 * supplied as an argument — it is strictly injected by backend authentication middleware.
 */

export const agentTools = [
  {
    type: "function",
    function: {
      name: "searchRestaurants",
      description:
        "Search and discover BiteDash partner restaurants by name, cuisine, rating, price level, or vegetarian focus. Returns matching open restaurants with ratings, average prep times, and locations.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keyword for restaurant name or description (e.g. 'Bistro', 'Pizza', 'Italian')",
          },
          cuisine: {
            type: "string",
            description: "Cuisine type such as Biryani, Italian, Fast Food, Japanese, Chinese, Healthy",
          },
          vegetarianOnly: {
            type: "boolean",
            description: "Filter for restaurants offering pure vegetarian or extensive veg selections",
          },
          minRating: {
            type: "number",
            description: "Minimum reliability / rating score out of 100 (e.g. 90)",
          },
          limit: {
            type: "number",
            description: "Maximum number of restaurants to return (default: 5, max: 10)",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "searchMenuItems",
      description:
        "Search dishes and menu items across restaurants or within a specific restaurant. Supports natural language queries like 'biryani', 'cheeseburger', 'veg pizza under 300'. Returns item IDs, names, prices, restaurant names, and availability.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Food name or term (e.g. 'chicken biryani', 'margherita pizza', 'french fries', 'spicy burger')",
          },
          category: {
            type: "string",
            description: "Category of dish (e.g. 'Biryani', 'Pizza', 'Burger', 'Beverages')",
          },
          maxPrice: {
            type: "number",
            description: "Maximum item price in ₹ (Indian Rupee), e.g. 250, 300, 500",
          },
          vegetarianOnly: {
            type: "boolean",
            description: "Whether to return only vegetarian dishes",
          },
          isSpicy: {
            type: "boolean",
            description: "Whether to filter for spicy dishes",
          },
          restaurantId: {
            type: "string",
            description: "Optional 24-character ObjectId of a specific restaurant to search within",
          },
          limit: {
            type: "number",
            description: "Maximum items to return (default: 6, max: 12)",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "searchFoodItems",
      description:
        "Search and discover food dishes and items by name, category, price limit, spice level, or vegetarian focus. Grounded directly in BiteDash's real restaurant menus.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Food name or term (e.g. 'biryani', 'burger', 'coke')",
          },
          maxPrice: {
            type: "number",
            description: "Maximum item price in ₹ (Indian Rupee)",
          },
          vegetarianOnly: {
            type: "boolean",
            description: "Filter for vegetarian food items",
          },
          isSpicy: {
            type: "boolean",
            description: "Filter for spicy dishes",
          },
          limit: {
            type: "number",
            description: "Maximum number of dishes to return",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getRestaurantDetails",
      description:
        "Get comprehensive details of a specific restaurant including operating status, average preparation time, address, phone, and reliability score.",
      parameters: {
        type: "object",
        properties: {
          restaurantId: {
            type: "string",
            description: "The 24-character ObjectId of the restaurant",
          },
          restaurantName: {
            type: "string",
            description: "Name of the restaurant to resolve if ID is unknown",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getMenu",
      description:
        "Retrieve the complete food menu of a restaurant with item names, prices, descriptions, and current availability.",
      parameters: {
        type: "object",
        properties: {
          restaurantId: {
            type: "string",
            description: "The 24-character ObjectId of the restaurant",
          },
        },
        required: ["restaurantId"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getFoodItemDetails",
      description:
        "Get specific details of a food item by ID or exact name, including price, description, restaurant details, and availability status.",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The 24-character ObjectId of the menu item",
          },
          itemName: {
            type: "string",
            description: "Name of the item if ID is unknown",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getCart",
      description:
        "Fetch the authenticated customer's real BiteDash shopping cart. Returns itemized entries, quantities, unit prices, subtotal, delivery fee, platform fee, applied coupon, and total amount.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },

  {
    type: "function",
    function: {
      name: "addToCart",
      description:
        "Add a food item to the authenticated customer's cart. Automatically validates availability, stock, and multi-vendor restrictions (one restaurant per cart).",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The 24-character ObjectId of the MenuItem to add",
          },
          quantity: {
            type: "number",
            description: "Number of units to add (default: 1)",
          },
          restaurantId: {
            type: "string",
            description: "Optional 24-character ObjectId of the restaurant the item belongs to",
          },
        },
        required: ["itemId"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "removeFromCart",
      description:
        "Remove a food item completely from the authenticated customer's cart.",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The 24-character ObjectId of the item to remove",
          },
          cartId: {
            type: "string",
            description: "The 24-character ObjectId of the cart record if known",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "updateCartQuantity",
      description:
        "Update the quantity of a specific item in the authenticated customer's cart. Set quantity to 0 to remove it.",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The 24-character ObjectId of the MenuItem in the cart",
          },
          quantity: {
            type: "number",
            description: "New desired quantity (e.g. 1, 2, 3... or 0 to remove)",
          },
        },
        required: ["itemId", "quantity"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "clearCart",
      description:
        "Completely empty the authenticated customer's cart.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getAvailableCoupons",
      description:
        "Get all available BiteDash promo codes, their discount rules, minimum order amounts, and eligibility based on the current cart subtotal.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },

  {
    type: "function",
    function: {
      name: "applyCoupon",
      description:
        "Validate and apply a promo code to the authenticated customer's cart. Calculates verified savings and stores the applied discount.",
      parameters: {
        type: "object",
        properties: {
          couponCode: {
            type: "string",
            description: "The promo code to apply (e.g. 'WELCOME50', 'BITEDASH20', 'FEAST100', 'FREEDEL')",
          },
        },
        required: ["couponCode"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "calculateCartTotal",
      description:
        "Calculate the authoritative price breakdown for the current cart, including subtotal, coupon savings, delivery fee, and platform fee.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getOrderHistory",
      description:
        "Fetch previous orders placed by the authenticated customer. Returns order IDs, dates, restaurants, total amounts, and statuses.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of past orders to return (default: 5, max: 10)",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getOrderDetails",
      description:
        "Fetch detailed information for a specific order belonging to the customer, including itemized dishes, delivery stage, rider information, and delivery address.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The 24-character ObjectId or last 6 characters of the order ID",
          },
        },
        required: ["orderId"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getOrderStatus",
      description:
        "Get real-time tracking status, kitchen preparation stage, and delivery rider status for an active or recent order.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The 24-character ObjectId or last 6 characters of the order ID",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getOrderETA",
      description:
        "Compute and return the intelligent dynamic ETA breakdown for an active order using BiteDash's live telemetry engine (kitchen prep time, queue load, rider distance, and time-of-day traffic).",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The 24-character ObjectId or last 6 characters of the order ID",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "reorderPreviousOrder",
      description:
        "Reorder meals from a previous order. Verifies item availability, updates current prices, clears old cart, and adds available dishes to the cart.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The 24-character ObjectId or last 6 characters of the past order to repeat",
          },
        },
      },
    },
  },

  {
    type: "function",
    function: {
      name: "createOrder",
      description:
        "Place an order from the user's current cart with explicit checkout confirmation. NEVER call this tool unless the user has explicitly confirmed placement (e.g. 'Yes', 'Confirm', 'Place it').",
      parameters: {
        type: "object",
        properties: {
          paymentMethod: {
            type: "string",
            enum: ["cod", "razorpay"],
            description: "Payment method: 'cod' (Cash on Delivery) or 'razorpay' (Online payment)",
          },
          addressId: {
            type: "string",
            description: "Optional address ID. If omitted, the user's primary/default saved delivery address is used",
          },
          confirmed: {
            type: "boolean",
            description: "Must be true. Explicit confirmation from customer to proceed with order creation",
          },
        },
        required: ["paymentMethod", "confirmed"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "initiatePayment",
      description:
        "Initiate a secure Razorpay payment for a newly created pending order. Returns checkout metadata and order ID. Never handles raw payment cards or secrets.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The 24-character ObjectId of the pending order to pay for",
          },
        },
        required: ["orderId"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getUserPreferences",
      description:
        "Retrieve the authenticated customer's taste preferences, preferred cuisines, vegetarian preference, and past favorite dishes.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];
