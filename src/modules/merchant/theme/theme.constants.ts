export type ThemeFont =
  | 'system'
  | 'dm-sans'
  | 'manrope'
  | 'plus-jakarta'
  | 'kantumruy'
  | 'noto-khmer'
  | 'fraunces'
  | 'playfair';

export type ThemeSectionId =
  | 'hero'
  | 'promises'
  | 'featured'
  | 'categories'
  | 'shopTheLook'
  | 'newsletter';

export type ThemePromiseIcon =
  | 'truck'
  | 'qr'
  | 'store'
  | 'shield'
  | 'refresh'
  | 'leaf';

export type ThemeConfig = {
  version: 1;
  brand: {
    storeName: string;
    logoUrl: string | null;
    faviconUrl: string | null;
  };
  colors: {
    preset: 'emerald' | 'indigo' | 'rose' | 'saffron' | 'graphite' | 'custom';
    accent: string;
    scheme: 'light' | 'dark' | 'system';
    light: { background: string; surface: string; foreground: string };
    dark: { background: string; surface: string; foreground: string };
  };
  typography: {
    heading: ThemeFont;
    body: ThemeFont;
    baseSize: number;
  };
  shape: {
    radius: number;
    buttonStyle: 'solid' | 'outline' | 'soft';
  };
  layout: {
    template: 'classic' | 'boutique' | 'market';
    headerAlign: 'left' | 'center';
    stickyHeader: boolean;
    productColumns: 2 | 3 | 4 | 5;
    cardStyle: 'bordered' | 'flat' | 'elevated';
  };
  announcement: {
    enabled: boolean;
    text: string;
  };
  hero: {
    imageUrl: string | null;
    heading: string;
    subheading: string;
    ctaLabel: string;
    align: 'left' | 'center';
    overlay: number;
    height: 'short' | 'medium' | 'tall';
  };
  sections: Array<{ id: ThemeSectionId; enabled: boolean }>;
  productCard: {
    imageRatio: 'square' | 'portrait' | 'landscape';
    quickAdd: boolean;
    secondImageOnHover: boolean;
    showRiel: boolean;
  };
  productPage: {
    gallery: 'thumbnails' | 'stacked';
    stickyBuyBar: boolean;
    showDeliveryEstimate: boolean;
  };
  promises: {
    items: Array<{ icon: ThemePromiseIcon; text: string }>;
  };
  footer: {
    about: string;
    showPaymentBadges: boolean;
    social: {
      facebook: string;
      instagram: string;
      tiktok: string;
      telegram: string;
    };
  };
  mobile: {
    bottomBar: boolean;
    floatingCart: boolean;
  };
};

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  version: 1,
  brand: {
    storeName: 'Acme Store',
    logoUrl: null,
    faviconUrl: null,
  },
  colors: {
    preset: 'emerald',
    accent: '#059669',
    scheme: 'light',
    light: {
      background: '#f8fafc',
      surface: '#ffffff',
      foreground: '#0f172a',
    },
    dark: {
      background: '#09090b',
      surface: '#18181b',
      foreground: '#fafafa',
    },
  },
  typography: {
    heading: 'system',
    body: 'system',
    baseSize: 16,
  },
  shape: {
    radius: 16,
    buttonStyle: 'solid',
  },
  layout: {
    template: 'classic',
    headerAlign: 'left',
    stickyHeader: true,
    productColumns: 4,
    cardStyle: 'bordered',
  },
  announcement: {
    enabled: true,
    text: 'Free delivery in Phnom Penh on orders over $30',
  },
  hero: {
    imageUrl: null,
    heading: 'Everyday goods, made to last',
    subheading:
      'Tees, cold brew and small-batch homeware. Order by 2 PM for same-day delivery.',
    ctaLabel: 'Shop best sellers',
    align: 'left',
    overlay: 35,
    height: 'medium',
  },
  sections: [
    { id: 'hero', enabled: true },
    { id: 'promises', enabled: false },
    { id: 'featured', enabled: true },
    { id: 'categories', enabled: true },
    { id: 'shopTheLook', enabled: true },
    { id: 'newsletter', enabled: false },
  ],
  productCard: {
    imageRatio: 'portrait',
    quickAdd: true,
    secondImageOnHover: false,
    showRiel: false,
  },
  productPage: {
    gallery: 'thumbnails',
    stickyBuyBar: true,
    showDeliveryEstimate: true,
  },
  promises: {
    items: [
      { icon: 'truck', text: 'Same-day delivery in Phnom Penh' },
      { icon: 'qr', text: 'Pay with any bank app (KHQR)' },
      { icon: 'store', text: 'Free pickup at our shop' },
    ],
  },
  footer: {
    about: 'Small-batch goods from Phnom Penh.',
    showPaymentBadges: true,
    social: {
      facebook: '',
      instagram: '',
      tiktok: '',
      telegram: '',
    },
  },
  mobile: {
    bottomBar: true,
    floatingCart: true,
  },
};

const colorSchema = {
  type: 'string',
  pattern: '^#[0-9a-fA-F]{6}$',
} as const;

const nullableUrlSchema = {
  type: ['string', 'null'],
  maxLength: 2048,
} as const;

const schemeColorsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['background', 'surface', 'foreground'],
  properties: {
    background: colorSchema,
    surface: colorSchema,
    foreground: colorSchema,
  },
} as const;

const fontSchema = {
  type: 'string',
  enum: [
    'system',
    'dm-sans',
    'manrope',
    'plus-jakarta',
    'kantumruy',
    'noto-khmer',
    'fraunces',
    'playfair',
  ],
} as const;

const socialHandleSchema = {
  type: 'string',
  maxLength: 60,
  pattern: '^[A-Za-z0-9._-]*$',
} as const;

export const THEME_CONFIG_SCHEMA = {
  $id: 'merchant-theme-config',
  type: 'object',
  additionalProperties: false,
  required: [
    'version',
    'brand',
    'colors',
    'typography',
    'shape',
    'layout',
    'announcement',
    'hero',
    'sections',
    'productCard',
    'productPage',
    'promises',
    'footer',
    'mobile',
  ],
  properties: {
    version: { const: 1 },
    brand: {
      type: 'object',
      additionalProperties: false,
      required: ['storeName', 'logoUrl', 'faviconUrl'],
      properties: {
        storeName: { type: 'string', minLength: 1, maxLength: 60 },
        logoUrl: nullableUrlSchema,
        faviconUrl: nullableUrlSchema,
      },
    },
    colors: {
      type: 'object',
      additionalProperties: false,
      required: ['preset', 'accent', 'scheme', 'light', 'dark'],
      properties: {
        preset: {
          type: 'string',
          enum: ['emerald', 'indigo', 'rose', 'saffron', 'graphite', 'custom'],
        },
        accent: colorSchema,
        scheme: { type: 'string', enum: ['light', 'dark', 'system'] },
        light: schemeColorsSchema,
        dark: schemeColorsSchema,
      },
    },
    typography: {
      type: 'object',
      additionalProperties: false,
      required: ['heading', 'body', 'baseSize'],
      properties: {
        heading: fontSchema,
        body: fontSchema,
        baseSize: { type: 'integer', minimum: 14, maximum: 18 },
      },
    },
    shape: {
      type: 'object',
      additionalProperties: false,
      required: ['radius', 'buttonStyle'],
      properties: {
        radius: {
          type: 'integer',
          minimum: 0,
          maximum: 28,
          multipleOf: 2,
        },
        buttonStyle: { type: 'string', enum: ['solid', 'outline', 'soft'] },
      },
    },
    layout: {
      type: 'object',
      additionalProperties: false,
      required: [
        'template',
        'headerAlign',
        'stickyHeader',
        'productColumns',
        'cardStyle',
      ],
      properties: {
        template: { type: 'string', enum: ['classic', 'boutique', 'market'] },
        headerAlign: { type: 'string', enum: ['left', 'center'] },
        stickyHeader: { type: 'boolean' },
        productColumns: { enum: [2, 3, 4, 5] },
        cardStyle: {
          type: 'string',
          enum: ['bordered', 'flat', 'elevated'],
        },
      },
    },
    announcement: {
      type: 'object',
      additionalProperties: false,
      required: ['enabled', 'text'],
      properties: {
        enabled: { type: 'boolean' },
        text: { type: 'string', maxLength: 90 },
      },
    },
    hero: {
      type: 'object',
      additionalProperties: false,
      required: [
        'imageUrl',
        'heading',
        'subheading',
        'ctaLabel',
        'align',
        'overlay',
        'height',
      ],
      properties: {
        imageUrl: nullableUrlSchema,
        heading: { type: 'string', maxLength: 60 },
        subheading: { type: 'string', maxLength: 160 },
        ctaLabel: { type: 'string', maxLength: 28 },
        align: { type: 'string', enum: ['left', 'center'] },
        overlay: {
          type: 'integer',
          minimum: 0,
          maximum: 80,
          multipleOf: 5,
        },
        height: { type: 'string', enum: ['short', 'medium', 'tall'] },
      },
    },
    sections: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      uniqueItems: true,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'enabled'],
        properties: {
          id: {
            type: 'string',
            enum: [
              'hero',
              'promises',
              'featured',
              'categories',
              'shopTheLook',
              'newsletter',
            ],
          },
          enabled: { type: 'boolean' },
        },
      },
    },
    productCard: {
      type: 'object',
      additionalProperties: false,
      required: ['imageRatio', 'quickAdd', 'secondImageOnHover', 'showRiel'],
      properties: {
        imageRatio: {
          type: 'string',
          enum: ['square', 'portrait', 'landscape'],
        },
        quickAdd: { type: 'boolean' },
        secondImageOnHover: { type: 'boolean' },
        showRiel: { type: 'boolean' },
      },
    },
    productPage: {
      type: 'object',
      additionalProperties: false,
      required: ['gallery', 'stickyBuyBar', 'showDeliveryEstimate'],
      properties: {
        gallery: { type: 'string', enum: ['thumbnails', 'stacked'] },
        stickyBuyBar: { type: 'boolean' },
        showDeliveryEstimate: { type: 'boolean' },
      },
    },
    promises: {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          maxItems: 4,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['icon', 'text'],
            properties: {
              icon: {
                type: 'string',
                enum: ['truck', 'qr', 'store', 'shield', 'refresh', 'leaf'],
              },
              text: { type: 'string', maxLength: 48 },
            },
          },
        },
      },
    },
    footer: {
      type: 'object',
      additionalProperties: false,
      required: ['about', 'showPaymentBadges', 'social'],
      properties: {
        about: { type: 'string', maxLength: 160 },
        showPaymentBadges: { type: 'boolean' },
        social: {
          type: 'object',
          additionalProperties: false,
          required: ['facebook', 'instagram', 'tiktok', 'telegram'],
          properties: {
            facebook: socialHandleSchema,
            instagram: socialHandleSchema,
            tiktok: socialHandleSchema,
            telegram: socialHandleSchema,
          },
        },
      },
    },
    mobile: {
      type: 'object',
      additionalProperties: false,
      required: ['bottomBar', 'floatingCart'],
      properties: {
        bottomBar: { type: 'boolean' },
        floatingCart: { type: 'boolean' },
      },
    },
  },
} as const;
